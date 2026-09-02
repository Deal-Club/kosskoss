/**
 * Catalogue RÉEL KossKoss Select (cosmétique multimarque, marché Cameroun).
 *
 * Les produits proviennent des exports du client (data/client/*.csv), joints et
 * transformés par scripts/build-kk-catalog.mjs vers prisma/data/kk-catalog.json.
 * Pour régénérer après une mise à jour des CSV : `node scripts/build-kk-catalog.mjs`.
 *
 * Montants en FCFA ENTIERS dans `priceCents` (XAF sans sous-unité).
 * Lancement : tsx prisma/seed-kk.ts — réinitialise le catalogue puis le recharge.
 * Les images produits sont ajoutées séparément (téléversées en back-office).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";
import { QUESTIONS } from "../src/lib/kk/diagnostic";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

type CatalogGroup = { slug: string; label: string; labelEn: string };
type CatalogCategory = { slug: string; group: string; label: string; labelEn: string };
type CatalogProduct = {
  slug: string;
  sku: string;
  category: string;
  brand: string;
  name: string;
  priceFcfa: number;
  short: string;
  desc: string;
  bullets: string[];
  tags: string[];
  image?: string;
  /** Contenance (« 210 ml »…), colonne Format de description_produit.csv.
   *  Vide pour les coffrets ("Set") et pour les rares produits sans
   *  correspondance de description — voir build-kk-catalog.mjs. */
  format?: string;
};
type Catalog = { groups: CatalogGroup[]; categories: CatalogCategory[]; products: CatalogProduct[] };

const catalog: Catalog = JSON.parse(
  readFileSync(path.join(process.cwd(), "prisma", "data", "kk-catalog.json"), "utf-8"),
);

// Initialise le questionnaire du Diagnostic Beauté depuis la config de code —
// une seule fois : si des questions existent déjà (potentiellement éditées en
// admin), on n'y touche pas.
async function seedDiagnostic() {
  if ((await prisma.diagQuestion.count()) > 0) return;
  for (const [qi, q] of QUESTIONS.entries()) {
    const question = await prisma.diagQuestion.create({
      data: { key: q.id, title: q.title, subtitle: q.subtitle, position: qi, active: true },
    });
    await prisma.diagAnswer.createMany({
      data: q.answers.map((a, ai) => ({
        questionId: question.id,
        key: a.id,
        label: a.label,
        description: a.description,
        icon: a.icon,
        tags: JSON.stringify(a.tags),
        chip: a.chip ?? "",
        position: ai,
        active: true,
      })),
    });
  }
}

async function main() {
  // Réinitialise le catalogue (branche de dev, sans commande réelle) pour
  // repartir propre et ne pas cumuler d'anciens produits.
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.group.deleteMany({});

  const groupIdBySlug: Record<string, string> = {};
  for (const [i, g] of catalog.groups.entries()) {
    const row = await prisma.group.upsert({
      where: { slug: g.slug },
      update: { label: g.label, labelEn: g.labelEn, position: i },
      create: { slug: g.slug, label: g.label, labelEn: g.labelEn, position: i },
    });
    groupIdBySlug[g.slug] = row.id;
  }

  const categoryIdBySlug: Record<string, string> = {};
  for (const [i, c] of catalog.categories.entries()) {
    const groupId = groupIdBySlug[c.group];
    const row = await prisma.category.upsert({
      where: { groupId_slug: { groupId, slug: c.slug } },
      update: { label: c.label, labelEn: c.labelEn, position: i },
      create: { groupId, slug: c.slug, label: c.label, labelEn: c.labelEn, position: i },
    });
    categoryIdBySlug[c.slug] = row.id;
  }

  for (const p of catalog.products) {
    const data = {
      categoryId: categoryIdBySlug[p.category],
      brand: p.brand,
      name: p.name,
      shortDescription: p.short,
      description: p.desc,
      bullets: JSON.stringify(p.bullets),
      tags: JSON.stringify(p.tags),
      priceCents: p.priceFcfa,
      image: p.image ?? "",
      active: true,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: {
        ...data,
        slug: p.slug,
        sku: p.sku,
        stock: 30,
      },
    });

    // Contenance du catalogue client comme unique variation du produit : la
    // vignette et la fiche l'affichent au titre (« ... - 50 ml »), voir
    // `formatProductTitle`. `productVariant.deleteMany({})` plus haut a déjà
    // vidé la table pour ce reseed complet — `create` et non `upsert` suffit.
    if (p.format) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          label: p.format,
          priceCents: p.priceFcfa,
          position: 0,
          active: true,
        },
      });
    }
  }

  await seedDiagnostic();

  const [products, categories, groups] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.group.count(),
  ]);
  console.log(`Seed KossKoss OK : ${groups} univers, ${categories} catégories, ${products} produits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
