/**
 * Catalogue de DÉMONSTRATION KossKoss Select (cosmétique multimarque).
 *
 * Produits réels de marques distribuées au Cameroun (CeraVe, La Roche-Posay,
 * The Ordinary, Bioderma, Nivea, Garnier, Cetaphil, Neutrogena, Palmer's,
 * Cantu, Shea Moisture…), à des prix FCFA plausibles relevés sur des boutiques
 * beauté camerounaises. ⚠️ Données de développement, à valider/remplacer par le
 * vrai stock. Toutes supprimables/éditables en back-office.
 *
 * Montants en FCFA ENTIERS dans `priceCents` (XAF sans sous-unité).
 * Lancement : tsx prisma/seed-kk.ts — idempotent (upserts par slug).
 */
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";
import { QUESTIONS } from "../src/lib/kk/diagnostic";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

type SeedGroup = { slug: string; label: string; labelEn: string };
type SeedCategory = { slug: string; group: string; label: string; labelEn: string };
type SeedVariant = { label: string; priceFcfa: number; oldPriceFcfa?: number };
type SeedProduct = {
  slug: string;
  category: string;
  brand: string;
  name: string;
  priceFcfa: number;
  oldPriceFcfa?: number;
  badge?: "bestseller" | "nouveau";
  short: string;
  desc: string;
  bullets: string[];
  variants?: SeedVariant[];
};

const GROUPS: SeedGroup[] = [
  { slug: "soins-visage", label: "Soins du visage", labelEn: "Facial care" },
  { slug: "corps-cheveux", label: "Corps & Cheveux", labelEn: "Body & Hair" },
];

const CATEGORIES: SeedCategory[] = [
  { slug: "nettoyants", group: "soins-visage", label: "Nettoyants", labelEn: "Cleansers" },
  { slug: "serums", group: "soins-visage", label: "Sérums", labelEn: "Serums" },
  { slug: "hydratants", group: "soins-visage", label: "Hydratants", labelEn: "Moisturizers" },
  { slug: "solaires", group: "soins-visage", label: "Solaires", labelEn: "Sun care" },
  { slug: "corps", group: "corps-cheveux", label: "Soins du corps", labelEn: "Body care" },
  { slug: "cheveux", group: "corps-cheveux", label: "Cheveux", labelEn: "Hair" },
];

const PRODUCTS: SeedProduct[] = [
  // --- Nettoyants ---
  { slug: "cerave-nettoyant-hydratant", category: "nettoyants", brand: "CeraVe", name: "Nettoyant Hydratant Visage", priceFcfa: 13500, badge: "bestseller",
    short: "Nettoyant doux sans savon pour peau normale à sèche.", desc: "Un nettoyant crémeux qui élimine impuretés et maquillage sans dessécher, tout en préservant la barrière cutanée. Développé avec des dermatologues.", bullets: ["3 céramides essentiels", "Acide hyaluronique", "Sans parfum, non comédogène"] },
  { slug: "bioderma-sensibio-h2o", category: "nettoyants", brand: "Bioderma", name: "Sensibio H2O Eau Micellaire", priceFcfa: 12000,
    short: "Eau micellaire démaquillante pour peau sensible.", desc: "L'eau micellaire de référence pour nettoyer et démaquiller le visage et les yeux en douceur, sans rinçage. Idéale pour les peaux sensibles.", bullets: ["Formule brevetée D.A.F.", "Démaquille en douceur", "Sans rinçage"], variants: [{ label: "250 ml", priceFcfa: 12000 }, { label: "500 ml", priceFcfa: 18000 }] },
  { slug: "lrp-effaclar-gel", category: "nettoyants", brand: "La Roche-Posay", name: "Effaclar Gel Moussant Purifiant", priceFcfa: 14000,
    short: "Gel purifiant pour peau grasse à imperfections.", desc: "Un gel moussant qui nettoie en profondeur les peaux grasses à tendance acnéique, élimine l'excès de sébum et respecte l'équilibre de la peau.", bullets: ["Zinc PCA", "Nettoie sans dessécher", "Testé sur peaux sensibles"] },
  { slug: "cetaphil-gentle-cleanser", category: "nettoyants", brand: "Cetaphil", name: "Gentle Skin Cleanser", priceFcfa: 11000,
    short: "Nettoyant tout en douceur, tous types de peau.", desc: "Un nettoyant doux non moussant, utilisable avec ou sans eau, qui respecte le pH naturel de la peau. Convient aux peaux les plus sensibles.", bullets: ["Sans savon", "pH neutre", "Non irritant"], variants: [{ label: "236 ml", priceFcfa: 11000 }, { label: "473 ml", priceFcfa: 18000 }] },

  // --- Sérums ---
  { slug: "to-niacinamide", category: "serums", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", priceFcfa: 9000, badge: "bestseller",
    short: "Sérum régulateur de sébum et de pores.", desc: "Un concentré haute performance qui réduit l'apparence des imperfections et resserre les pores dilatés. Un incontournable des peaux mixtes à grasses.", bullets: ["Niacinamide 10%", "Zinc 1%", "Réduit les imperfections"] },
  { slug: "to-hyaluronic", category: "serums", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", priceFcfa: 9500, badge: "nouveau",
    short: "Hydratation intense multi-profondeur.", desc: "Trois formes d'acide hyaluronique de poids moléculaires différents pour une hydratation à plusieurs niveaux de la peau, complétée par la vitamine B5.", bullets: ["Acide hyaluronique multi-poids", "Vitamine B5", "Repulpe et lisse"] },
  { slug: "cerave-vitamine-c", category: "serums", brand: "CeraVe", name: "Sérum Éclat Vitamine C", priceFcfa: 20000, badge: "bestseller",
    short: "Sérum antioxydant éclat à la vitamine C pure.", desc: "Un sérum à la vitamine C pure qui ravive l'éclat, unifie le teint et protège des agressions extérieures, tout en renforçant la barrière cutanée.", bullets: ["Vitamine C pure (10%)", "Céramides", "Acide hyaluronique"] },
  { slug: "lrp-vitamin-c10", category: "serums", brand: "La Roche-Posay", name: "Pure Vitamin C10 Sérum", priceFcfa: 30000, oldPriceFcfa: 34000,
    short: "Sérum anti-rides et anti-fatigue.", desc: "Un sérum concentré en vitamine C pure qui réduit visiblement les rides et redonne fermeté et éclat à la peau. Testé sur peaux sensibles.", bullets: ["Vitamine C pure 10%", "Acide hyaluronique", "Neurosensine apaisante"] },
  { slug: "to-glycolic", category: "serums", brand: "The Ordinary", name: "Glycolic Acid 7% Toning Solution", priceFcfa: 10000,
    short: "Lotion tonique exfoliante à l'acide glycolique.", desc: "Une lotion tonique du soir qui exfolie en douceur pour affiner le grain de peau et raviver l'éclat. À utiliser 2 à 3 fois par semaine.", bullets: ["Acide glycolique 7%", "Affine le grain", "Usage du soir"] },

  // --- Hydratants ---
  { slug: "cerave-creme-hydratante", category: "hydratants", brand: "CeraVe", name: "Crème Hydratante", priceFcfa: 18500, badge: "bestseller",
    short: "Crème riche visage et corps, 48h d'hydratation.", desc: "Une crème riche mais non grasse qui hydrate durablement et restaure la barrière cutanée grâce à la technologie de libération prolongée MVE.", bullets: ["3 céramides essentiels", "Acide hyaluronique", "Technologie MVE 48h"], variants: [{ label: "340 g", priceFcfa: 18500 }, { label: "454 g", priceFcfa: 24000 }] },
  { slug: "lrp-effaclar-k", category: "hydratants", brand: "La Roche-Posay", name: "Effaclar K+ Soin Correcteur", priceFcfa: 16000,
    short: "Soin correcteur matifiant pour peaux grasses.", desc: "Un soin quotidien qui matifie, affine le grain de peau et prévient les imperfections récurrentes des peaux grasses.", bullets: ["Acide salicylique", "LHA + Airlicium", "Matifie 8h"] },
  { slug: "nivea-soft", category: "hydratants", brand: "Nivea", name: "Soft Crème Hydratante", priceFcfa: 5000,
    short: "Crème légère hydratante visage, corps et mains.", desc: "Une crème polyvalente à la texture fondante qui hydrate intensément et pénètre rapidement, pour le visage, le corps et les mains.", bullets: ["Huile de jojoba", "Vitamine E", "Pénètre rapidement"] },
  { slug: "neutrogena-hydro-boost", category: "hydratants", brand: "Neutrogena", name: "Hydro Boost Gel Hydratant", priceFcfa: 15000, badge: "nouveau",
    short: "Gel-crème hydratant à l'acide hyaluronique.", desc: "Un gel-crème rafraîchissant qui abreuve la peau en eau et la maintient hydratée toute la journée, sans effet gras. Idéal en climat chaud.", bullets: ["Acide hyaluronique", "Texture gel fraîche", "Non gras, non comédogène"] },
  { slug: "cerave-sa-creme", category: "hydratants", brand: "CeraVe", name: "Crème SA Lissante", priceFcfa: 17000,
    short: "Crème lissante pour peau rugueuse.", desc: "Une crème qui lisse et adoucit les zones rugueuses (bras, jambes) tout en hydratant, grâce à l'acide salicylique et lactique.", bullets: ["Acide salicylique", "Acide lactique", "3 céramides"] },

  // --- Solaires ---
  { slug: "lrp-anthelios-uvmune", category: "solaires", brand: "La Roche-Posay", name: "Anthelios UVMune 400 SPF50+", priceFcfa: 22000,
    short: "Fluide solaire très haute protection.", desc: "Une protection solaire de nouvelle génération contre les UVA ultra-longs, invisible et confortable, pour toutes les carnations.", bullets: ["Filtre UVA long", "SPF50+", "Fini invisible"] },
  { slug: "garnier-ambre-solaire", category: "solaires", brand: "Garnier", name: "Ambre Solaire Lait SPF50", priceFcfa: 8000,
    short: "Lait protecteur hydratant SPF50.", desc: "Un lait solaire hydratant à haute protection, facile à appliquer et résistant à l'eau, pour toute la famille.", bullets: ["SPF50 haute protection", "Résiste à l'eau", "Hydrate 24h"] },
  { slug: "bioderma-photoderm", category: "solaires", brand: "Bioderma", name: "Photoderm Max SPF50+", priceFcfa: 19000,
    short: "Protection solaire pour peaux sensibles.", desc: "Une protection solaire très haute conçue pour les peaux sensibles et intolérantes au soleil, qui renforce les défenses naturelles de la peau.", bullets: ["SPF50+", "Cellular Bioprotection", "Sans parfum"] },

  // --- Corps ---
  { slug: "nivea-lait-corps", category: "corps", brand: "Nivea", name: "Lait Hydratant Corps", priceFcfa: 6500,
    short: "Lait nourrissant pour peau sèche.", desc: "Un lait corps nourrissant qui hydrate en profondeur les peaux sèches et laisse la peau douce et souple durablement.", bullets: ["Huile d'amande", "Vitamine E", "Hydratation 48h"], variants: [{ label: "250 ml", priceFcfa: 6500 }, { label: "400 ml", priceFcfa: 9000 }] },
  { slug: "palmers-cocoa-butter", category: "corps", brand: "Palmer's", name: "Cocoa Butter Formula", priceFcfa: 9000, badge: "bestseller",
    short: "Beurre de cacao réparateur anti-vergetures.", desc: "Un soin culte au beurre de cacao qui nourrit intensément, assouplit la peau et aide à atténuer vergetures et marques.", bullets: ["Beurre de cacao pur", "Vitamine E", "Peaux très sèches"] },
  { slug: "vaseline-intensive-care", category: "corps", brand: "Vaseline", name: "Intensive Care Lotion", priceFcfa: 5500,
    short: "Lotion réparation intense.", desc: "Une lotion corps à absorption rapide qui répare la peau sèche dès la première application et l'hydrate durablement.", bullets: ["Glycérine", "Répare la peau sèche", "Absorption rapide"] },
  { slug: "cerave-lotion-corps", category: "corps", brand: "CeraVe", name: "Lotion Hydratante Corps", priceFcfa: 16000,
    short: "Lotion légère 24h d'hydratation.", desc: "Une lotion légère et non grasse qui hydrate 24h et restaure la barrière cutanée, pour le corps comme pour le visage.", bullets: ["3 céramides", "Acide hyaluronique", "Non gras"] },

  // --- Cheveux ---
  { slug: "cantu-leave-in", category: "cheveux", brand: "Cantu", name: "Shea Butter Leave-In Conditioning Repair Cream", priceFcfa: 12000, badge: "bestseller",
    short: "Crème sans rinçage pour cheveux bouclés et crépus.", desc: "Une crème coiffante sans rinçage au beurre de karité qui hydrate, répare et définit les boucles des cheveux secs et texturés.", bullets: ["Beurre de karité", "Sans sulfate ni paraben", "Hydrate et définit"] },
  { slug: "shea-moisture-curl", category: "cheveux", brand: "Shea Moisture", name: "Coconut & Hibiscus Curl Smoothie", priceFcfa: 14000,
    short: "Crème coiffante pour boucles définies.", desc: "Une crème coiffante nourrissante qui définit les boucles, réduit les frisottis et apporte brillance et souplesse.", bullets: ["Karité & huile de coco", "Sans silicone", "Boucles définies"] },
  { slug: "garnier-ultra-doux", category: "cheveux", brand: "Garnier", name: "Ultra Doux Après-Shampoing Nourrissant", priceFcfa: 4500,
    short: "Après-shampoing nourrissant.", desc: "Un après-shampoing aux huiles végétales qui démêle, nourrit et fait briller les cheveux, pour une chevelure douce au quotidien.", bullets: ["Huiles végétales", "Démêle facilement", "Brillance"] },
];

// Photos réelles (Unsplash, téléchargées dans public/images/products).
// Rotation par catégorie pour varier les visuels. À remplacer par les photos
// officielles des produits via le back-office (Cloudinary).
const CATEGORY_IMAGES: Record<string, string[]> = {
  nettoyants: ["/images/products/p1.jpg"],
  serums: ["/images/products/p8.jpg", "/images/products/p3.jpg"],
  hydratants: ["/images/products/p7.jpg", "/images/products/p1.jpg"],
  solaires: ["/images/products/p4.jpg"],
  corps: ["/images/products/p2.jpg"],
  cheveux: ["/images/products/p5.jpg"],
};
const catImageCounter: Record<string, number> = {};
function imageFor(category: string): string {
  const imgs = CATEGORY_IMAGES[category] ?? [];
  if (imgs.length === 0) return "";
  const n = catImageCounter[category] ?? 0;
  catImageCounter[category] = n + 1;
  return imgs[n % imgs.length];
}

// Tags du Diagnostic Beauté par catégorie (base) + par produit (spécifique).
const CATEGORY_TAGS: Record<string, string[]> = {
  nettoyants: ["nettoyage"],
  serums: ["traitement"],
  hydratants: ["hydratation"],
  solaires: ["solaire", "protection"],
  corps: ["corps"],
  cheveux: ["cheveux"],
};
const PRODUCT_TAGS: Record<string, string[]> = {
  "cerave-nettoyant-hydratant": ["peau_seche", "peau_sensible", "hydratation"],
  "bioderma-sensibio-h2o": ["peau_sensible", "apaisant"],
  "lrp-effaclar-gel": ["peau_grasse", "imperfections"],
  "cetaphil-gentle-cleanser": ["peau_sensible", "peau_seche"],
  // « taches » : actifs qui documentent une action sur l'hyperpigmentation
  // post-inflammatoire — niacinamide, vitamine C, acide glycolique — ainsi que
  // les protections solaires, sans lesquelles les marques ne s'estompent pas.
  "to-niacinamide": ["peau_grasse", "imperfections", "matifiant", "taches"],
  "to-hyaluronic": ["hydratation", "peau_seche", "peau_mixte"],
  "cerave-vitamine-c": ["eclat", "anti_age", "peau_mixte", "taches"],
  "lrp-vitamin-c10": ["eclat", "anti_age", "premium", "taches"],
  "to-glycolic": ["eclat", "imperfections", "peau_grasse", "taches"],
  "cerave-creme-hydratante": ["hydratation", "peau_seche"],
  "lrp-effaclar-k": ["peau_grasse", "matifiant", "imperfections"],
  "nivea-soft": ["hydratation", "budget_eco"],
  "neutrogena-hydro-boost": ["hydratation", "peau_mixte", "peau_grasse"],
  "cerave-sa-creme": ["peau_seche", "imperfections"],
  "lrp-anthelios-uvmune": ["peau_sensible", "anti_age", "taches"],
  "garnier-ambre-solaire": ["budget_eco", "taches"],
  "bioderma-photoderm": ["peau_sensible", "taches"],
  "nivea-lait-corps": ["peau_seche", "budget_eco"],
  "palmers-cocoa-butter": ["peau_seche"],
  "vaseline-intensive-care": ["hydratation", "budget_eco"],
  "cerave-lotion-corps": ["hydratation", "peau_seche"],
  "cantu-leave-in": [],
  "shea-moisture-curl": [],
  "garnier-ultra-doux": ["budget_eco"],
};
function tagsFor(p: SeedProduct): string[] {
  return [...new Set([...(CATEGORY_TAGS[p.category] ?? []), ...(PRODUCT_TAGS[p.slug] ?? [])])];
}

function skuOf(slug: string): string {
  return `KK-${slug.toUpperCase().replace(/-/g, "").slice(0, 14)}`;
}

// Initialise le questionnaire en base depuis la config de code — une seule
// fois : si des questions existent déjà (potentiellement éditées en admin), on
// n'y touche pas.
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
  // Réinitialise le catalogue de démonstration (branche de dev, sans commande)
  // pour repartir propre et ne pas cumuler d'anciens produits de démo.
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.group.deleteMany({});

  const groupIdBySlug: Record<string, string> = {};
  for (const [i, g] of GROUPS.entries()) {
    const row = await prisma.group.upsert({
      where: { slug: g.slug },
      update: { label: g.label, labelEn: g.labelEn },
      create: { slug: g.slug, label: g.label, labelEn: g.labelEn, position: i },
    });
    groupIdBySlug[g.slug] = row.id;
  }

  const categoryIdBySlug: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const groupId = groupIdBySlug[c.group];
    const row = await prisma.category.upsert({
      where: { groupId_slug: { groupId, slug: c.slug } },
      update: { label: c.label, labelEn: c.labelEn },
      create: { groupId, slug: c.slug, label: c.label, labelEn: c.labelEn, position: i },
    });
    categoryIdBySlug[c.slug] = row.id;
  }

  for (const p of PRODUCTS) {
    const image = imageFor(p.category);
    const tags = JSON.stringify(tagsFor(p));
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        categoryId: categoryIdBySlug[p.category],
        brand: p.brand,
        name: p.name,
        shortDescription: p.short,
        description: p.desc,
        bullets: JSON.stringify(p.bullets),
        priceCents: p.priceFcfa,
        oldPriceCents: p.oldPriceFcfa ?? null,
        badge: p.badge ?? null,
        image,
        tags,
        active: true,
      },
      create: {
        categoryId: categoryIdBySlug[p.category],
        brand: p.brand,
        name: p.name,
        slug: p.slug,
        sku: skuOf(p.slug),
        shortDescription: p.short,
        description: p.desc,
        bullets: JSON.stringify(p.bullets),
        priceCents: p.priceFcfa,
        oldPriceCents: p.oldPriceFcfa ?? null,
        badge: p.badge ?? null,
        image,
        tags,
        stock: 30,
        active: true,
      },
    });

    // Variantes : on reconstruit à l'identique (idempotent).
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    if (p.variants?.length) {
      await prisma.productVariant.createMany({
        data: p.variants.map((v, idx) => ({
          productId: product.id,
          label: v.label,
          sku: `${skuOf(p.slug)}-${idx + 1}`,
          priceCents: v.priceFcfa,
          oldPriceCents: v.oldPriceFcfa ?? null,
          position: idx,
          active: true,
        })),
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
