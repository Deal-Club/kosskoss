import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/server/prisma";
import { validateProductContent } from "../src/lib/productContent";
import { PRODUCT_CONTENT } from "./data/product-content";

// Applique le contenu rédigé au catalogue, par slug (unique en base — le SKU ne l'est pas).
//
// Lancement complet :
//   npx tsx --env-file=.env scripts/apply-product-content.ts
// Lancement restreint à quelques fiches :
//   npx tsx --env-file=.env scripts/apply-product-content.ts bois-vrac-25cm bois-vrac-33cm
//
// La réécriture du catalogue se fait catégorie par catégorie. Sans ce filtre, une
// seule fiche encore au format court bloquerait l'application de toutes les
// autres : la validation est volontairement globale et refuse d'écrire dès la
// première anomalie. Restreindre aux slugs demandés limite la validation — et
// l'écriture — au lot en cours de reprise, sans relâcher le contrôle sur lui.

async function main() {
  const slugsDemandes = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const lot =
    slugsDemandes.length > 0
      ? PRODUCT_CONTENT.filter((e) => slugsDemandes.includes(e.slug))
      : PRODUCT_CONTENT;

  // Un slug passé en argument mais absent du fichier de contenu est une faute de
  // frappe : mieux vaut s'arrêter que d'appliquer un lot incomplet en silence.
  const inconnus = slugsDemandes.filter((s) => !PRODUCT_CONTENT.some((e) => e.slug === s));
  if (inconnus.length > 0) {
    console.error(`Slug(s) absent(s) du fichier de contenu : ${inconnus.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  if (slugsDemandes.length > 0) {
    console.log(`Lot restreint à ${lot.length} fiche(s) : ${lot.map((e) => e.slug).join(", ")}`);
  }

  const anomalies = validateProductContent(lot);
  if (anomalies.length > 0) {
    console.error(`${anomalies.length} anomalie(s), rien n'a été écrit :`);
    for (const a of anomalies) console.error(`  - ${a}`);
    process.exitCode = 1;
    return;
  }

  // Sauvegarde intégrale avant la première écriture : la base visée est celle
  // de production, et un retour en arrière doit rester possible.
  const avant = await prisma.product.findMany();
  const dossier = path.join(process.cwd(), ".tmp-backup");
  await mkdir(dossier, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const fichier = path.join(dossier, `products-${horodatage}.json`);
  await writeFile(fichier, JSON.stringify(avant, null, 2), "utf8");
  console.log(`Sauvegarde de ${avant.length} produits : ${fichier}`);

  let modifies = 0;
  let introuvables = 0;

  // Transaction unique pour tout le lot : si la connexion tombe en cours de
  // route, aucune écriture n'est retenue plutôt que de laisser le catalogue
  // à moitié modifié sans que rien ne le signale.
  //
  // Les délais par défaut de Prisma — 5 s d'exécution, 2 s d'attente — sont
  // taillés pour une base locale. Ici la cible est Neon, dont chaque aller-retour
  // porte la latence du réseau : trente-cinq écritures y demandent une poignée de
  // secondes, et la transaction expirait avant la fin. Les valeurs ci-dessous
  // laissent de la marge sans jamais retenir un verrou de façon déraisonnable.
  await prisma.$transaction(
    async (tx) => {
      for (const entry of lot) {
        // Vérification préalable dans la sauvegarde : le slug est unique en base
        // (`slug String @unique` dans le schéma Prisma), contrairement au SKU.
        const cible = avant.find((p) => p.slug === entry.slug);
        if (!cible) {
          console.warn(`Slug introuvable en base, ignoré : ${entry.slug}`);
          introuvables += 1;
          continue;
        }

        await tx.product.update({
          where: { slug: entry.slug },
          data: {
            description: entry.description,
            shortDescription: entry.shortDescription,
            descriptionEn: entry.descriptionEn,
            shortDescriptionEn: entry.shortDescriptionEn,
            // Les champs absents de l'entrée ne sont pas touchés.
            // Les caractéristiques sont stockées en JSON (pas de liste scalaire
            // en base, pour rester portable d'un moteur SQL à l'autre).
            ...(entry.bullets !== undefined ? { bullets: JSON.stringify(entry.bullets) } : {}),
            ...(entry.bulletsEn !== undefined ? { bulletsEn: JSON.stringify(entry.bulletsEn) } : {}),
            ...(entry.gtin !== undefined ? { gtin: entry.gtin } : {}),
            ...(entry.mpn !== undefined ? { mpn: entry.mpn } : {}),
            ...(entry.googleProductCategory !== undefined
              ? { googleProductCategory: entry.googleProductCategory }
              : {}),
            ...(entry.shippingWeightGrams !== undefined
              ? { shippingWeightGrams: entry.shippingWeightGrams }
              : {}),
            ...(entry.energyEfficiencyClass !== undefined
              ? { energyEfficiencyClass: entry.energyEfficiencyClass }
              : {}),
          },
        });
        modifies += 1;
      }
    },
    // 120 s d'exécution, 30 s d'attente d'un créneau : large pour trente-cinq
    // écritures distantes, court au regard d'un verrou de table.
    { timeout: 120_000, maxWait: 30_000 },
  );

  console.log(`${modifies} produit(s) mis à jour, ${introuvables} slug(s) introuvable(s).`);

  // Une faute de frappe sur un slug ne doit pas ressortir en succès (code 0) :
  // c'est le même genre d'anomalie silencieuse que la validation en amont
  // cherche justement à éviter.
  if (introuvables > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((erreur) => {
    console.error("Échec de l'application du contenu :", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
