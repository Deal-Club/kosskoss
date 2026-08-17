/**
 * Pose les accès du back-office à partir des variables d'environnement.
 *
 * Deux comptes, deux natures :
 *  - ADMIN_EMAIL / ADMIN_PASSWORD        -> compte visible, rôle « owner ».
 *    C'est l'accès de travail : il apparaît dans /admin/users, ses actions sont
 *    signées de son adresse.
 *  - SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD -> compte masqué, rôle « superadmin ».
 *    Invisible pour tous les autres comptes (voir SUPERADMIN_ROLE dans
 *    src/server/admins.ts) : absent de la liste des accès, absent des
 *    destinataires de notification de commande, et ses écritures sont
 *    journalisées sous « System » plutôt que sous son adresse.
 *
 * Aucun identifiant n'est écrit dans ce fichier : le dépôt est public, les
 * valeurs vivent dans .env.local (non versionné) ou dans les variables de
 * l'hébergeur. Le script ne les affiche jamais non plus.
 *
 * Lancement :
 *   npx tsx --env-file=.env.local scripts/acces-admin.ts
 *   npx tsx --env-file=.env.local scripts/acces-admin.ts --appliquer
 *   npx tsx --env-file=.env.local scripts/acces-admin.ts --appliquer --desactiver=ancien@exemple.com
 *
 * Sans `--appliquer`, le script se contente de décrire ce qu'il ferait.
 *
 * `--desactiver=<adresse>` retire l'accès d'un ancien compte sans le supprimer :
 * `active = false` suffit à fermer la porte (authenticateAdmin refuse un compte
 * inactif) et la ligne reste consultable. La suppression, elle, est définitive
 * et emporte l'historique du compte : on ne la fait pas à la légère.
 */
import { prisma } from "../src/server/prisma";
import { hashPassword } from "../src/lib/password";
import { SUPERADMIN_ROLE } from "../src/server/admins";

const appliquer = process.argv.includes("--appliquer");

const aDesactiver = process.argv
  .filter((argument) => argument.startsWith("--desactiver="))
  .map((argument) => argument.slice("--desactiver=".length).trim().toLowerCase())
  .filter(Boolean);

interface Compte {
  variableEmail: string;
  variableMotDePasse: string;
  role: string;
  nom: string;
  description: string;
}

const COMPTES: Compte[] = [
  {
    variableEmail: "ADMIN_EMAIL",
    variableMotDePasse: "ADMIN_PASSWORD",
    role: "owner",
    nom: "Administration",
    description: "compte visible",
  },
  {
    variableEmail: "SUPERADMIN_EMAIL",
    variableMotDePasse: "SUPERADMIN_PASSWORD",
    role: SUPERADMIN_ROLE,
    nom: "System",
    description: "compte masqué",
  },
];

/** Crée le compte s'il manque, réaligne mot de passe, rôle et activation sinon. */
async function poser(compte: Compte): Promise<void> {
  const email = (process.env[compte.variableEmail] ?? "").trim().toLowerCase();
  const motDePasse = process.env[compte.variableMotDePasse] ?? "";

  if (!email || !motDePasse) {
    console.log(
      `— ${compte.description} : ignoré, ${compte.variableEmail} ou ${compte.variableMotDePasse} est vide.`,
    );
    return;
  }

  const existant = await prisma.adminUser.findUnique({ where: { email } });

  if (!appliquer) {
    console.log(
      existant
        ? `— ${compte.description} : ${email} existe (rôle « ${existant.role} », ${
            existant.active ? "actif" : "inactif"
          }) -> mot de passe réécrit, rôle « ${compte.role} », actif.`
        : `— ${compte.description} : ${email} serait créé (rôle « ${compte.role} »).`,
    );
    return;
  }

  // Le nom n'est posé qu'à la création : un intitulé changé depuis le
  // back-office n'a pas à être écrasé à chaque passage du script.
  await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash: hashPassword(motDePasse),
      role: compte.role,
      active: true,
    },
    create: {
      email,
      name: compte.nom,
      passwordHash: hashPassword(motDePasse),
      role: compte.role,
      active: true,
    },
  });

  console.log(
    `✔ ${compte.description} : ${email} — rôle « ${compte.role} », actif, mot de passe posé.`,
  );
}

/** Ferme l'accès d'un ancien compte, sans effacer sa ligne. */
async function desactiver(email: string): Promise<void> {
  const existant = await prisma.adminUser.findUnique({ where: { email } });
  if (!existant) {
    console.log(`— désactivation : ${email} est inconnu, rien à faire.`);
    return;
  }
  if (!existant.active) {
    console.log(`— désactivation : ${email} est déjà inactif.`);
    return;
  }

  // Même garde-fou que deleteAdminUser : on ne ferme pas la dernière porte.
  const actifs = await prisma.adminUser.count({ where: { active: true } });
  if (actifs <= 1) {
    console.log(
      `✗ désactivation : ${email} est le dernier compte actif — poser les nouveaux accès d'abord.`,
    );
    return;
  }

  if (!appliquer) {
    console.log(`— désactivation : ${email} serait passé à inactif.`);
    return;
  }

  await prisma.adminUser.update({ where: { email }, data: { active: false } });
  console.log(`✔ désactivation : ${email} ne peut plus se connecter (ligne conservée).`);
}

async function main(): Promise<void> {
  console.log(appliquer ? "Application des accès :" : "Simulation (ajouter --appliquer) :");

  for (const compte of COMPTES) {
    await poser(compte);
  }
  for (const email of aDesactiver) {
    await desactiver(email);
  }

  // État final : les superadmins sont volontairement inclus ici — ce script est
  // lancé depuis un terminal par la personne qui détient déjà les secrets.
  const tous = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  console.log("\nComptes du back-office :");
  for (const ligne of tous) {
    const marque = ligne.role === SUPERADMIN_ROLE ? " (masqué)" : "";
    console.log(
      `  ${ligne.active ? "actif  " : "inactif"} ${ligne.email} — ${ligne.role}${marque}`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
