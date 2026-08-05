/**
 * Retire tous les avis de démonstration créés par `scripts/seed-avis-demo.ts`.
 *
 * La suppression porte sur la double empreinte laissée à la création —
 * `moderatorNote` ET `moderatedBy` — pour qu'un avis véritable ne puisse jamais
 * être emporté par erreur : il faudrait qu'un client ait par hasard les deux
 * champs de modération remplis avec ces valeurs exactes.
 *
 * Lancement :
 *   DATABASE_URL="postgresql://…" npx tsx scripts/purge-avis-demo.ts
 *   DATABASE_URL="postgresql://…" npx tsx scripts/purge-avis-demo.ts --appliquer
 *
 * Sans `--appliquer`, le script se contente de compter : on voit ce qui
 * partirait avant que quoi que ce soit ne parte.
 */
import { prisma } from "../src/server/prisma";
import { MARQUEUR_DEMO, MODERATEUR_DEMO } from "./data/avis-demo-corpus";

const EMPREINTE = { moderatorNote: MARQUEUR_DEMO, moderatedBy: MODERATEUR_DEMO };

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL est absente.");
    process.exitCode = 1;
    return;
  }

  const appliquer = process.argv.includes("--appliquer");

  const [demo, total] = await Promise.all([
    prisma.review.count({ where: EMPREINTE }),
    prisma.review.count(),
  ]);

  console.log(`Avis en base           : ${total}`);
  console.log(`Portant l'empreinte    : ${demo}`);
  console.log(`Avis véritables gardés : ${total - demo}`);

  if (demo === 0) {
    console.log("\nRien à purger.");
    return;
  }

  if (!appliquer) {
    console.log(`\nSimulation. Relancer avec --appliquer pour supprimer ces ${demo} avis.`);
    return;
  }

  const { count } = await prisma.review.deleteMany({ where: EMPREINTE });
  const restants = await prisma.review.count();
  console.log(`\n${count} avis de démonstration supprimés. ${restants} avis restants.`);
}

main()
  .catch((erreur) => {
    console.error("Échec de la purge :", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
