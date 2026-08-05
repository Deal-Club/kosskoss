/**
 * Peuple le catalogue avec les 8 produits bois de chauffage en vrac et sur palette,
 * chacun avec ses variations de volume.
 *
 * Le script est ADDITIF et IDEMPOTENT : il upserte le groupe « bois-de-chauffage »
 * et les deux catégories « vrac » et « palette », puis upserte chaque produit sur son
 * slug. Les variations sont recréées à chaque passage (deleteMany + createMany),
 * car elles n'ont pas de clé naturelle à upserter.
 *
 * Lancement : node --env-file=.env.local --import tsx scripts/seed-bois-variations.ts
 * (les imports ESM étant hoistés, dotenv chargé dans le fichier arriverait
 * trop tard : le client Prisma lit DATABASE_URL dès son import.)
 */
import { prisma } from "../src/server/prisma";

const IMG = "/images/brennholz";

// Catégorie Google Merchant : la seule feuille de la taxonomie qui couvre à
// la fois bûches, granulés et briquettes (taxonomy-with-ids.fr-FR.txt, id 625).
const GOOGLE_CATEGORY =
  "Maison et jardin > Accessoires pour cheminées et poêles à bois > Combustible et bois de chauffage";

interface VariationData {
  /** Libellé du volume, ex. « 3 stères » */
  s: string;
  /** Prix TTC en euros */
  p: number;
}

interface ProduitData {
  slug: string;
  longueurCm: number;
  variations: VariationData[];
}

// ---- Données produits ----

const VRAC: ProduitData[] = [
  {
    slug: "bois-vrac-50cm",
    longueurCm: 50,
    variations: [
      { s: "1 stère", p: 175 },
      { s: "2 stères", p: 250 },
      { s: "3 stères", p: 315 },
      { s: "4 stères", p: 380 },
      { s: "5 stères", p: 435 },
      { s: "6 stères", p: 510 },
    ],
  },
  {
    slug: "bois-vrac-33cm",
    longueurCm: 33,
    variations: [
      { s: "1 stère", p: 185 },
      { s: "2 stères", p: 270 },
      { s: "3 stères", p: 345 },
      { s: "4 stères", p: 396 },
      { s: "5 stères", p: 455 },
      { s: "6 stères", p: 534 },
      { s: "7 stères", p: 623 },
    ],
  },
  {
    slug: "bois-vrac-25cm",
    longueurCm: 25,
    variations: [
      { s: "1 stère", p: 195 },
      { s: "2 stères", p: 290 },
      { s: "3 stères", p: 375 },
      { s: "4 stères", p: 412 },
      { s: "5 stères", p: 475 },
      { s: "6 stères", p: 558 },
      { s: "7 stères", p: 651 },
    ],
  },
];

const PALETTE: ProduitData[] = [
  {
    slug: "bois-palette-50cm",
    longueurCm: 50,
    variations: [
      { s: "2 stères", p: 265 },
      { s: "3 stères", p: 389 },
    ],
  },
  {
    slug: "bois-palette-40cm",
    longueurCm: 40,
    variations: [
      { s: "1,5 stère", p: 208 },
      { s: "2 stères", p: 266 },
      { s: "2,5 stères", p: 334 },
    ],
  },
  {
    slug: "bois-palette-33cm",
    longueurCm: 33,
    variations: [
      { s: "2,5 stères", p: 339 },
      { s: "3 stères", p: 394 },
    ],
  },
  {
    slug: "bois-palette-30cm",
    longueurCm: 30,
    variations: [
      { s: "2 stères", p: 268 },
      { s: "2,5 stères", p: 335 },
      { s: "3 stères", p: 394 },
    ],
  },
  {
    slug: "bois-palette-25cm",
    longueurCm: 25,
    variations: [
      { s: "1,8 stère", p: 233 },
      { s: "2 stères", p: 269 },
      { s: "3 stères", p: 395 },
    ],
  },
];

// ---- Helpers ----

function skuFromSlug(slug: string): string {
  return slug.replace(/[^a-z0-9]/g, "").slice(0, 12).toUpperCase();
}

function minPrice(variations: VariationData[]): number {
  return Math.min(...variations.map((v) => v.p));
}

// ---- Seed principal ----

async function main() {
  // 1. Upsert du groupe
  const groupRow = await prisma.group.upsert({
    where: { slug: "bois-de-chauffage" },
    create: {
      slug: "bois-de-chauffage",
      label: "Bois de chauffage",
      labelEn: "Firewood",
      position: 0,
    },
    update: {
      label: "Bois de chauffage",
      labelEn: "Firewood",
    },
  });

  // 2. Upsert de la catégorie « vrac »
  const vracRow = await prisma.category.upsert({
    where: { groupId_slug: { groupId: groupRow.id, slug: "vrac" } },
    create: {
      groupId: groupRow.id,
      slug: "vrac",
      label: "Bois de chauffage en vrac",
      labelEn: "Loose firewood",
      description:
        "Bois de chauffage livré en vrac, en mélange de feuillus durs (Chêne, Charme, Hêtre). Humidité d'environ 30 %, idéal pour un stockage de quelques mois avant utilisation.",
      descriptionEn:
        "Firewood delivered loose, a mix of dense hardwoods (Oak, Hornbeam, Beech). Around 30% moisture — ideal for a few months of storage before use.",
      image: `${IMG}/lose-schuettung.jpg`,
      guideIntro:
        "Le bois en vrac est la solution la plus économique pour les gros volumes. Il arrive par camion-grue et se décharge directement à l'endroit voulu.",
      guideIntroEn:
        "Loose firewood is the most economical option for large volumes. It arrives by crane truck and is unloaded directly where you want it.",
      guideClosing:
        "Prévoyez un espace de stockage ventilé et couvert pour laisser le bois finir de sécher avant la saison de chauffe.",
      guideClosingEn:
        "Plan for a ventilated, covered storage space to let the wood finish drying before the heating season.",
      position: 0,
    },
    update: {
      label: "Bois de chauffage en vrac",
      labelEn: "Loose firewood",
      position: 0,
    },
  });

  // 3. Upsert de la catégorie « palette »
  const paletteRow = await prisma.category.upsert({
    where: { groupId_slug: { groupId: groupRow.id, slug: "palette" } },
    create: {
      groupId: groupRow.id,
      slug: "palette",
      label: "Bois de chauffage sur palette",
      labelEn: "Palletised firewood",
      description:
        "Bois de chauffage extra-sec (feuillus durs — Chêne, Charme, Hêtre) livré sur palette filmée, prêt à brûler. Humidité inférieure à 20 %, idéal pour une utilisation immédiate.",
      descriptionEn:
        "Extra-dry firewood (hardwoods — Oak, Hornbeam, Beech) delivered on a wrapped pallet, ready to burn. Moisture below 20%, ideal for immediate use.",
      image: `${IMG}/palette-box.jpg`,
      guideIntro:
        "Le bois sur palette est conditionné en atelier, séché en séchoir et filmé : il arrive prêt à brûler, sans manipulation supplémentaire.",
      guideIntroEn:
        "Palletised firewood is workshop-prepared, kiln-dried and wrapped: it arrives ready to burn, with no further handling.",
      guideClosing:
        "Le film plastique protège la palette le temps du transport ; retirez-le dès la livraison pour laisser le bois respirer.",
      guideClosingEn:
        "The plastic wrap protects the pallet in transit; remove it on delivery to let the wood breathe.",
      position: 1,
    },
    update: {
      label: "Bois de chauffage sur palette",
      labelEn: "Palletised firewood",
      position: 1,
    },
  });

  // 4. Upsert des produits vrac + variations
  let totalProduits = 0;
  let totalVariations = 0;

  for (const produit of VRAC) {
    const image = `${IMG}/lose-schuettung.jpg`;
    const minPriceCents = minPrice(produit.variations) * 100;
    const nom = `Bois de chauffage en vrac ${produit.longueurCm} cm`;
    const nomEn = `Loose firewood ${produit.longueurCm} cm`;

    const productRow = await prisma.product.upsert({
      where: { slug: produit.slug },
      create: {
        categoryId: vracRow.id,
        slug: produit.slug,
        brand: "MLC Bois",
        name: nom,
        nameEn: nomEn,
        sku: skuFromSlug(produit.slug),
        shortDescription: `Mélange de feuillus durs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité environ 30 %. Livraison en vrac par camion-grue.`,
        shortDescriptionEn: `Dense hardwood mix (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Around 30% moisture. Delivered loose by crane truck.`,
        description: `Mélange de feuillus durs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité environ 30 %. Livraison en vrac par camion-grue.`,
        descriptionEn: `Dense hardwood mix (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Around 30% moisture. Delivered loose by crane truck.`,
        bullets: JSON.stringify([
          `Longueur de bûche ${produit.longueurCm} cm`,
          "Essences : Chêne, Charme, Hêtre",
          "Humidité environ 30 %",
          "Livraison en vrac par camion-grue",
        ]),
        bulletsEn: JSON.stringify([
          `Log length ${produit.longueurCm} cm`,
          "Species: Oak, Hornbeam, Beech",
          "Around 30% moisture",
          "Loose delivery by crane truck",
        ]),
        image,
        images: JSON.stringify([image]),
        priceCents: minPriceCents,
        googleProductCategory: GOOGLE_CATEGORY,
        active: true,
        stock: 99,
      },
      update: {
        categoryId: vracRow.id,
        brand: "MLC Bois",
        name: nom,
        nameEn: nomEn,
        sku: skuFromSlug(produit.slug),
        shortDescription: `Mélange de feuillus durs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité environ 30 %. Livraison en vrac par camion-grue.`,
        shortDescriptionEn: `Dense hardwood mix (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Around 30% moisture. Delivered loose by crane truck.`,
        description: `Mélange de feuillus durs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité environ 30 %. Livraison en vrac par camion-grue.`,
        descriptionEn: `Dense hardwood mix (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Around 30% moisture. Delivered loose by crane truck.`,
        bullets: JSON.stringify([
          `Longueur de bûche ${produit.longueurCm} cm`,
          "Essences : Chêne, Charme, Hêtre",
          "Humidité environ 30 %",
          "Livraison en vrac par camion-grue",
        ]),
        bulletsEn: JSON.stringify([
          `Log length ${produit.longueurCm} cm`,
          "Species: Oak, Hornbeam, Beech",
          "Around 30% moisture",
          "Loose delivery by crane truck",
        ]),
        image,
        images: JSON.stringify([image]),
        priceCents: minPriceCents,
        googleProductCategory: GOOGLE_CATEGORY,
        active: true,
      },
    });

    // Reset variations
    await prisma.productVariant.deleteMany({ where: { productId: productRow.id } });
    await prisma.productVariant.createMany({
      data: produit.variations.map((v, index) => ({
        productId: productRow.id,
        label: v.s,
        labelEn: v.s,
        sku: `${skuFromSlug(produit.slug)}-${index + 1}`,
        priceCents: v.p * 100,
        position: index,
        active: true,
      })),
    });

    totalProduits += 1;
    totalVariations += produit.variations.length;
  }

  // 5. Upsert des produits palette + variations
  for (const produit of PALETTE) {
    const image = `${IMG}/palette-box.jpg`;
    const minPriceCents = minPrice(produit.variations) * 100;
    const nom = `Bois de chauffage sur palette ${produit.longueurCm} cm`;
    const nomEn = `Palletised firewood ${produit.longueurCm} cm`;

    const productRow = await prisma.product.upsert({
      where: { slug: produit.slug },
      create: {
        categoryId: paletteRow.id,
        slug: produit.slug,
        brand: "MLC Bois",
        name: nom,
        nameEn: nomEn,
        sku: skuFromSlug(produit.slug),
        shortDescription: `Feuillus durs extra-secs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité inférieure à 20 %. Livraison sur palette filmée, prêt à brûler.`,
        shortDescriptionEn: `Extra-dry hardwoods (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Moisture below 20%. Delivered on wrapped pallet, ready to burn.`,
        description: `Feuillus durs extra-secs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité inférieure à 20 %. Livraison sur palette filmée, prêt à brûler.`,
        descriptionEn: `Extra-dry hardwoods (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Moisture below 20%. Delivered on wrapped pallet, ready to burn.`,
        bullets: JSON.stringify([
          `Longueur de bûche ${produit.longueurCm} cm`,
          "Essences : Chêne, Charme, Hêtre",
          "Humidité inférieure à 20 % — prêt à brûler",
          "Livraison sur palette filmée",
        ]),
        bulletsEn: JSON.stringify([
          `Log length ${produit.longueurCm} cm`,
          "Species: Oak, Hornbeam, Beech",
          "Moisture below 20% — ready to burn",
          "Delivered on wrapped pallet",
        ]),
        image,
        images: JSON.stringify([image]),
        priceCents: minPriceCents,
        googleProductCategory: GOOGLE_CATEGORY,
        active: true,
        stock: 99,
      },
      update: {
        categoryId: paletteRow.id,
        brand: "MLC Bois",
        name: nom,
        nameEn: nomEn,
        sku: skuFromSlug(produit.slug),
        shortDescription: `Feuillus durs extra-secs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité inférieure à 20 %. Livraison sur palette filmée, prêt à brûler.`,
        shortDescriptionEn: `Extra-dry hardwoods (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Moisture below 20%. Delivered on wrapped pallet, ready to burn.`,
        description: `Feuillus durs extra-secs (Chêne, Charme, Hêtre), bûches de ${produit.longueurCm} cm. Humidité inférieure à 20 %. Livraison sur palette filmée, prêt à brûler.`,
        descriptionEn: `Extra-dry hardwoods (Oak, Hornbeam, Beech), ${produit.longueurCm} cm logs. Moisture below 20%. Delivered on wrapped pallet, ready to burn.`,
        bullets: JSON.stringify([
          `Longueur de bûche ${produit.longueurCm} cm`,
          "Essences : Chêne, Charme, Hêtre",
          "Humidité inférieure à 20 % — prêt à brûler",
          "Livraison sur palette filmée",
        ]),
        bulletsEn: JSON.stringify([
          `Log length ${produit.longueurCm} cm`,
          "Species: Oak, Hornbeam, Beech",
          "Moisture below 20% — ready to burn",
          "Delivered on wrapped pallet",
        ]),
        image,
        images: JSON.stringify([image]),
        priceCents: minPriceCents,
        googleProductCategory: GOOGLE_CATEGORY,
        active: true,
      },
    });

    // Reset variations
    await prisma.productVariant.deleteMany({ where: { productId: productRow.id } });
    await prisma.productVariant.createMany({
      data: produit.variations.map((v, index) => ({
        productId: productRow.id,
        label: v.s,
        labelEn: v.s,
        sku: `${skuFromSlug(produit.slug)}-${index + 1}`,
        priceCents: v.p * 100,
        position: index,
        active: true,
      })),
    });

    totalProduits += 1;
    totalVariations += produit.variations.length;
  }

  console.log(`Catalogue bois à jour : ${totalProduits} produits, ${totalVariations} variations.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
