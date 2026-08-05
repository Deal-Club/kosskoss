/**
 * Aligne les vignettes de catégorie sur de vrais produits du catalogue.
 *
 * Les visuels d'origine étaient des photos d'ambiance : une cuisine pour le
 * rayon lave-vaisselle, un comptoir de café pour les machines à café. Elles ne
 * montraient donc pas ce qui est réellement vendu. On leur substitue le
 * packshot du produit le plus représentatif de chaque rayon, déjà hébergé sur
 * le CDN.
 *
 * Deux fichiers sont mis à jour, pour que la navigation et les pages de
 * catégorie racontent la même chose :
 *   - `src/data/categoryNav.ts` : les vignettes rondes de l'accueil ;
 *   - la colonne `image` de la table Category : l'en-tête des pages de rayon.
 *
 * Lancement : npx tsx --env-file=.env.local scripts/visuels-categories.ts
 *   --ecrire  applique les changements (sinon simulation)
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/server/prisma";

const ECRIRE = process.argv.includes("--ecrire");
const FICHIER_NAV = path.join(process.cwd(), "src", "data", "categoryNav.ts");

async function main(): Promise<void> {
  const categories = await prisma.category.findMany({
    include: { group: true },
    orderBy: [{ group: { position: "asc" } }, { position: "asc" }],
  });

  let source = await readFile(FICHIER_NAV, "utf-8");
  const journal: string[] = [];
  let remplacees = 0;

  for (const categorie of categories) {
    // Le mieux noté, puis le plus cher : celui qui donne la meilleure idée du
    // rayon, plutôt qu'un article d'entrée de gamme.
    const vedette = await prisma.product.findFirst({
      where: { categoryId: categorie.id, NOT: { image: null } },
      orderBy: [{ editorialRating: "desc" }, { priceCents: "desc" }],
      select: { brand: true, name: true, image: true },
    });

    if (!vedette?.image) {
      journal.push(`  ${categorie.slug.padEnd(18)} aucun produit avec visuel`);
      continue;
    }

    // Remplacement ciblé sur la ligne du slug, pour ne pas toucher au reste.
    const motif = new RegExp(`(\\{\\s*slug:\\s*"${categorie.slug}",[^}]*image:\\s*)"[^"]*"`);
    if (motif.test(source)) {
      source = source.replace(motif, `$1"${vedette.image}"`);
      remplacees += 1;
      journal.push(`  ${categorie.slug.padEnd(18)} → ${vedette.brand} ${vedette.name.slice(0, 34)}`);
    } else {
      journal.push(`  ${categorie.slug.padEnd(18)} absent de la navigation`);
    }

    if (ECRIRE) {
      await prisma.category.update({
        where: { id: categorie.id },
        data: { image: vedette.image },
      });
    }
  }

  if (ECRIRE) await writeFile(FICHIER_NAV, source);

  console.log(ECRIRE ? "Mode écriture." : "Simulation — relancer avec --ecrire pour appliquer.");
  console.log(journal.join("\n"));
  console.log(`\n${remplacees}/${categories.length} vignettes alignées sur un produit réel.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erreur) => {
    console.error(erreur);
    await prisma.$disconnect();
    process.exit(1);
  });
