/**
 * Ajoute au catalogue les références relevées sur les sites du marché.
 *
 * Sources : leboisquivouschauffe.pro (vrac au stère), holzkerssenbrock.de
 * (palettes), monsieur-buche.fr (bûches compressées),
 * combustiblesheil.com (granulés) et ecoflammebois.com (poêles). Seules les
 * données
 * factuelles en sont reprises — dénomination du produit, longueur de bûche,
 * conditionnement, prix. Les textes sont rédigés ici : recopier la prose d'un
 * concurrent exposerait au grief de contrefaçon et ferait surtout du contenu
 * dupliqué, que les moteurs de recherche déclassent.
 *
 * Les visuels sont ceux du dossier public/images/brennholz : on ne rapatrie pas
 * les photographies des sites sources, qui ne nous appartiennent pas.
 *
 * ADDITIF : le script ne supprime ni ne modifie aucun produit existant. Les
 * références importées portent le préfixe de slug « mkt- » pour rester
 * repérables et se retirer d'un seul coup si besoin.
 *
 * Relançable : chaque produit passe par un upsert sur son slug.
 *
 * Lancement : node --env-file=.env --import tsx scripts/importer-produits-marche.ts
 */
import { prisma } from "../src/server/prisma";

const IMG = "/images/brennholz";

/** Feuille de taxonomie Google du combustible (identifiant 625). */
const GOOGLE_COMBUSTIBLE =
  "Maison et jardin > Accessoires pour cheminées et poêles à bois > Combustible et bois de chauffage";

/**
 * Feuille de taxonomie Google des appareils (identifiant 6792), relevée dans
 * taxonomy-with-ids.fr-FR.txt. Un poêle n'est pas un combustible : le déclarer
 * sous 625 ferait refuser la fiche par Merchant Center.
 */
const GOOGLE_APPAREIL = "Maison et jardin > Cheminées";

interface ProduitImporte {
  slug: string;
  brand: string;
  name: string;
  nameEn: string;
  short: string;
  shortEn: string;
  bullets: string[];
  bulletsEn: string[];
  /** Prix en euros, tel que relevé sur le site source. */
  prix: number;
  /** Prix barré en euros, quand le site source affiche une remise. */
  prixBarre?: number;
  image: string;
  /** Poids d'expédition en kilogrammes. */
  poidsKg: number;
  stock: number;
  badge?: string;
  note?: number;
}

interface RayonImporte {
  categorie: string;
  /** Feuille de taxonomie Google commune aux produits du rayon. */
  googleCategory: string;
  produits: ProduitImporte[];
}

/** Référence produit, dérivée du slug : « mkt-vrac-25 » donne « MKT-VRAC-25 ». */
function reference(slug: string): string {
  return slug.toUpperCase();
}

// ---------------------------------------------------------------------------
// Bois en vrac — relevé sur leboisquivouschauffe.pro
//
// Vendu au stère, essence mixte de feuillus. Le prix baisse avec la longueur :
// plus la bûche est courte, plus il y a de coupes, donc de main-d'œuvre.
// ---------------------------------------------------------------------------

function vrac(options: {
  cm: number;
  prix: number;
  usage: string;
  usageEn: string;
}): ProduitImporte {
  const { cm, prix, usage, usageEn } = options;
  return {
    slug: `mkt-vrac-melange-${cm}cm-stere`,
    brand: "MLC Bois",
    name: `Bûches mélange feuillus ${cm} cm — Vrac, au stère`,
    nameEn: `Mixed hardwood logs ${cm} cm — loose, per stacked m³`,
    short: `Chêne, charme, hêtre et frêne mélangés, fendus à ${cm} cm. Livré en vrac et déversé à l'endroit que vous indiquez. Prix au stère, dégressif à partir de trois stères.`,
    shortEn: `Oak, hornbeam, beech and ash mixed, split to ${cm} cm. Delivered loose and tipped where you ask. Priced per stacked cubic metre, cheaper from three upwards.`,
    bullets: [
      "Mélange de feuillus : chêne, charme, hêtre, frêne",
      `Longueur de bûche ${cm} cm, fendue`,
      usage,
      "Vendu au stère, livré en vrac",
    ],
    bulletsEn: [
      "Hardwood mix: oak, hornbeam, beech, ash",
      `Log length ${cm} cm, split`,
      usageEn,
      "Sold per stacked cubic metre, delivered loose",
    ],
    prix,
    image: `${IMG}/lose-schuettung.jpg`,
    // Un stère de feuillu mi-sec pèse environ 600 kg.
    poidsKg: 600,
    stock: 120,
  };
}

const BOIS_EN_VRAC: RayonImporte = {
  categorie: "vrac",
  googleCategory: GOOGLE_COMBUSTIBLE,
  produits: [
    vrac({
      cm: 25,
      prix: 93,
      usage: "Pour poêle compact et insert de petite largeur",
      usageEn: "For compact stoves and narrow inserts",
    }),
    vrac({
      cm: 33,
      prix: 89,
      usage: "La longueur la plus courante, convient à la majorité des poêles",
      usageEn: "The most common length, fits most stoves",
    }),
    vrac({
      cm: 40,
      prix: 90,
      usage: "Pour insert large et foyer fermé de grande capacité",
      usageEn: "For wide inserts and large closed fireplaces",
    }),
    vrac({
      cm: 50,
      prix: 85,
      usage: "Pour cheminée ouverte et chaudière à bûches",
      usageEn: "For open fireplaces and log boilers",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Bois sur palette — relevé sur holzkerssenbrock.de
//
// Le catalogue allemand raisonne en Raummeter, qui est le stère français. Les
// dénominations sont traduites, les volumes et les prix repris tels quels.
// « Extra trocken » devient « extra sec » : un séchage poussé sous 15 %, au
// lieu des 18 % du séchage courant.
// ---------------------------------------------------------------------------

function palette(options: {
  cm: number;
  steres: number;
  prix: number;
  extraSec?: boolean;
  /** Vrai pour les lots annoncés 100 % feuillu, par opposition au tout-venant. */
  pur?: boolean;
}): ProduitImporte {
  const { cm, steres, prix, extraSec = false, pur = false } = options;
  const volume = steres.toLocaleString("fr-FR");
  const suffixe = extraSec ? "-extra-sec" : pur ? "-feuillu" : "";
  const qualifiant = extraSec ? " — Extra sec" : pur ? " — 100 % feuillu" : "";
  const qualifiantEn = extraSec ? " — extra dry" : pur ? " — 100% hardwood" : "";

  return {
    slug: `mkt-palette-${cm}cm-${String(steres).replace(".", "-")}st${suffixe}`,
    brand: "MLC Bois",
    name: `Bûches feuillu ${cm} cm — Palette ${volume} stère${steres >= 2 ? "s" : ""}${qualifiant}`,
    nameEn: `Hardwood logs ${cm} cm — pallet ${steres} stacked m³${qualifiantEn}`,
    short: `Bûches de feuillu fendues à ${cm} cm, rangées et cerclées sur palette de ${volume} stère${steres >= 2 ? "s" : ""}. ${
      extraSec
        ? "Séchage poussé sous 15 % d'humidité sur brut : allumage immédiat, rendement maximal."
        : "Séchées sous 18 % d'humidité sur brut, prêtes à brûler dès la livraison."
    }`,
    shortEn: `Hardwood logs split to ${cm} cm, stacked and strapped on a ${steres} stacked m³ pallet. ${
      extraSec
        ? "Dried below 15% moisture: lights immediately, maximum output."
        : "Dried below 18% moisture, ready to burn on delivery."
    }`,
    bullets: [
      extraSec
        ? "Humidité sur brut inférieure à 15 %"
        : "Humidité sur brut inférieure à 18 %",
      `Longueur de bûche ${cm} cm, fendue`,
      pur ? "100 % feuillu, sans résineux" : "Feuillus mélangés",
      `Palette de ${volume} stère${steres >= 2 ? "s" : ""}, déposée au sol par hayon`,
    ],
    bulletsEn: [
      extraSec ? "Moisture content below 15%" : "Moisture content below 18%",
      `Log length ${cm} cm, split`,
      pur ? "100% hardwood, no softwood" : "Mixed hardwoods",
      `${steres} stacked m³ pallet, set down by tail lift`,
    ],
    prix,
    image: `${IMG}/palette-box.jpg`,
    // Un stère de feuillu sec pèse environ 420 kg.
    poidsKg: Math.round(steres * 420),
    stock: 40,
  };
}

const BOIS_SUR_PALETTE: RayonImporte = {
  categorie: "palette",
  googleCategory: GOOGLE_COMBUSTIBLE,
  produits: [
    palette({ cm: 25, steres: 1.8, prix: 233, extraSec: true }),
    palette({ cm: 25, steres: 2, prix: 269 }),
    palette({ cm: 25, steres: 2, prix: 266, extraSec: true }),
    palette({ cm: 25, steres: 3, prix: 395 }),
    palette({ cm: 30, steres: 2, prix: 264 }),
    palette({ cm: 30, steres: 2, prix: 268, pur: true }),
    palette({ cm: 30, steres: 2.5, prix: 335 }),
    palette({ cm: 30, steres: 3, prix: 394, extraSec: true }),
    palette({ cm: 33, steres: 2.5, prix: 339, pur: true }),
    palette({ cm: 33, steres: 3, prix: 394 }),
    palette({ cm: 40, steres: 1.5, prix: 208, pur: true }),
    palette({ cm: 40, steres: 2, prix: 266, extraSec: true }),
    palette({ cm: 40, steres: 2.5, prix: 334 }),
    palette({ cm: 50, steres: 2, prix: 265 }),
    palette({ cm: 50, steres: 2, prix: 265, pur: true }),
    palette({ cm: 50, steres: 3, prix: 389 }),
  ],
};

// ---------------------------------------------------------------------------
// Bûches compressées — relevé sur monsieur-buche.fr
// ---------------------------------------------------------------------------

const BOIS_COMPRESSE: RayonImporte = {
  categorie: "bois-compresse",
  googleCategory: GOOGLE_COMBUSTIBLE,
  produits: [
    {
      slug: "mkt-compresse-hetre-pack-5",
      brand: "Ma Bûch'Hêtre",
      name: "Ma Bûch'Hêtre — Pack de 5 bûches compressées",
      nameEn: "Ma Bûch'Hêtre — pack of 5 compressed logs",
      short:
        "Sciure de hêtre compressée sans liant, en pack de cinq bûches. Le format d'appoint : de quoi tenir une soirée, ou tester avant d'engager une palette.",
      shortEn:
        "Beech sawdust compressed without binder, in packs of five logs. The top-up format: an evening's worth, or a trial before committing to a pallet.",
      bullets: [
        "Hêtre compressé, sans liant chimique",
        "Pack de 5 bûches",
        "Rendement trois à quatre fois supérieur au bois bûche",
        "Bois de Normandie",
      ],
      bulletsEn: [
        "Compressed beech, no chemical binder",
        "Pack of 5 logs",
        "Three to four times the output of split logs",
        "Wood from Normandy",
      ],
      prix: 4.5,
      image: `${IMG}/briketts.jpg`,
      poidsKg: 10,
      stock: 400,
    },
    {
      slug: "mkt-compresse-hetre-palette-104",
      brand: "Ma Bûch'Hêtre",
      name: "Ma Bûch'Hêtre — Palette de 104 packs (520 bûches)",
      nameEn: "Ma Bûch'Hêtre — pallet of 104 packs (520 logs)",
      short:
        "La palette complète : 104 packs, soit 520 bûches de hêtre compressé. De quoi passer l'hiver sur un quart de la place qu'exigerait le bois bûche.",
      shortEn:
        "The full pallet: 104 packs, that is 520 compressed beech logs. A whole winter in a quarter of the space split logs would need.",
      bullets: [
        "Hêtre compressé, sans liant chimique",
        "104 packs, soit 520 bûches",
        "Quatre fois moins de place que le bois bûche",
        "Livraison par camion à hayon",
      ],
      bulletsEn: [
        "Compressed beech, no chemical binder",
        "104 packs, that is 520 logs",
        "Four times less storage space than split logs",
        "Delivered by tail-lift lorry",
      ],
      prix: 440,
      image: `${IMG}/briketts.jpg`,
      poidsKg: 960,
      stock: 25,
      badge: "Meilleure vente",
      note: 4.8,
    },
    {
      slug: "mkt-compresse-crepito-palette-104",
      brand: "CREPITO",
      name: "CREPITO — Palette de 104 packs (520 bûches)",
      nameEn: "CREPITO — pallet of 104 packs (520 logs)",
      short:
        "Bûches compressées CREPITO, 104 packs sur palette. Braise longue et rechargement propre : la formule des nuits de chauffe, en complément du bois bûche.",
      shortEn:
        "CREPITO compressed logs, 104 packs on a pallet. Long embers and clean reloading: the overnight option, alongside split logs.",
      bullets: [
        "Sciure compressée sans liant",
        "104 packs, soit 520 bûches",
        "Braise tenue toute la nuit",
        "Livraison par camion à hayon",
      ],
      bulletsEn: [
        "Compressed sawdust, no binder",
        "104 packs, that is 520 logs",
        "Embers hold overnight",
        "Delivered by tail-lift lorry",
      ],
      prix: 440,
      image: `${IMG}/briketts.jpg`,
      poidsKg: 960,
      stock: 25,
    },
  ],
};

// ---------------------------------------------------------------------------
// Poêles à bois — relevé sur ecoflammebois.com
//
// Contrairement au combustible, l'appareil est un produit de marque : le nom du
// fabricant fait foi et n'est pas remplacé par le nôtre. La puissance commande
// le volume chauffable — on compte environ 1 kW pour 10 m² correctement isolés,
// et c'est ce repère qui est repris dans chaque fiche plutôt qu'une promesse de
// surface, qui dépendrait de l'isolation.
// ---------------------------------------------------------------------------

function poele(options: {
  marque: string;
  modele: string;
  kw: number;
  prix: number;
  /** Remise affichée sur le site source, en pourcentage. */
  remise?: number;
}): ProduitImporte {
  const { marque, modele, kw, prix, remise } = options;
  const slugModele = modele
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // Environ 1 kW pour 10 m² dans un logement correctement isolé.
  const surface = kw * 10;

  return {
    slug: `mkt-poele-${marque.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${slugModele}`,
    brand: marque,
    name: `${marque} ${modele}`,
    nameEn: `${marque} ${modele}`,
    short: `Poêle à bûches de ${kw} kW. Cette puissance couvre environ ${surface} m² dans un logement correctement isolé — davantage dans une construction récente, moins dans une maison ancienne.`,
    shortEn: `${kw} kW log stove. This output covers roughly ${surface} m² in a properly insulated home — more in a recent build, less in an older house.`,
    bullets: [
      `Puissance nominale ${kw} kW`,
      `Environ ${surface} m² chauffés en logement correctement isolé`,
      "Fonctionne aux bûches, sans électricité",
      "Pose par un professionnel qualifié exigée par l'assurance",
    ],
    bulletsEn: [
      `Rated output ${kw} kW`,
      `Around ${surface} m² heated in a properly insulated home`,
      "Burns logs, needs no electricity",
      "Installation by a qualified professional required by insurers",
    ],
    prix,
    // Le site source affiche un prix barré : on le reconstitue depuis la remise.
    prixBarre: remise ? Math.round(prix / (1 - remise / 100)) : undefined,
    image: `${IMG}/kaminfeuer.jpg`,
    // Un poêle en acier pèse de l'ordre de 10 kg par kilowatt, plus le socle.
    poidsKg: kw * 10 + 40,
    stock: 6,
  };
}

const POELES: RayonImporte = {
  categorie: "poele-a-bois",
  googleCategory: GOOGLE_APPAREIL,
  produits: [
    poele({ marque: "INVICTA", modele: "REMILLY 7 kW", kw: 7, prix: 399 }),
    poele({ marque: "INTERSTOVES", modele: "LYA 12 kW", kw: 12, prix: 489, remise: 44 }),
    poele({ marque: "INTERSTOVES", modele: "ALESSIA 14 kW", kw: 14, prix: 577, remise: 45 }),
    poele({ marque: "INTERSTOVES", modele: "SARA 12 kW", kw: 12, prix: 577, remise: 44 }),
    poele({ marque: "INTERSTOVES", modele: "JUAN 14 kW", kw: 14, prix: 606, remise: 45 }),
    poele({ marque: "INTERSTOVES", modele: "MATTEO 10 kW", kw: 10, prix: 1126, remise: 51 }),
    poele({ marque: "DEVILLE", modele: "SANDY 8 kW LAB", kw: 8, prix: 1142, remise: 20 }),
    poele({ marque: "DEVILLE", modele: "TORON 50 8 kW", kw: 8, prix: 1342, remise: 38 }),
    poele({ marque: "LA NORDICA EXTRAFLAME", modele: "Isetta Evo 4.0", kw: 7.3, prix: 1465, remise: 40 }),
    poele({ marque: "DEVILLE", modele: "ORENSE 8 kW", kw: 8, prix: 2145, remise: 36 }),
    poele({ marque: "DEVILLE", modele: "EGUZKI étanche 6 kW", kw: 6, prix: 2600, remise: 37 }),
  ],
};

// ---------------------------------------------------------------------------
// Granulés de bois — relevé sur combustiblesheil.com
//
// Vendus exclusivement à la palette, dont le nombre de sacs varie d'une marque
// à l'autre : c'est le tonnage, et non le nombre de sacs, qui permet de
// comparer deux offres. Chaque fiche l'affiche donc explicitement.
// ---------------------------------------------------------------------------

function granules(options: {
  marque: string;
  slugMarque: string;
  sacs: number;
  prix: number;
  /** Ce qui distingue réellement cette marque, relevé sur sa fiche source. */
  atout: string;
  atoutEn: string;
  certification: string;
}): ProduitImporte {
  const { marque, slugMarque, sacs, prix, atout, atoutEn, certification } = options;
  const kg = sacs * 15;
  const tonnes = (kg / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const prixTonne = Math.round((prix / kg) * 1000);

  return {
    slug: `mkt-granules-${slugMarque}-palette`,
    brand: marque,
    name: `Granulés ${marque} — Palette de ${sacs} sacs de 15 kg`,
    nameEn: `${marque} wood pellets — pallet of ${sacs} × 15 kg bags`,
    short: `${atout} Palette de ${sacs} sacs de 15 kg, soit ${tonnes} tonne${kg >= 2000 ? "s" : ""} — environ ${prixTonne} € la tonne.`,
    shortEn: `${atoutEn} Pallet of ${sacs} × 15 kg bags, that is ${(kg / 1000).toFixed(2)} tonnes — around €${prixTonne} per tonne.`,
    bullets: [
      certification,
      `${sacs} sacs de 15 kg, soit ${tonnes} tonne${kg >= 2000 ? "s" : ""}`,
      `Environ ${prixTonne} € la tonne`,
      "Pour poêle, insert et chaudière à granulés",
    ],
    bulletsEn: [
      certification,
      `${sacs} × 15 kg bags, that is ${(kg / 1000).toFixed(2)} tonnes`,
      `Around €${prixTonne} per tonne`,
      "For pellet stoves, inserts and boilers",
    ],
    prix,
    image: `${IMG}/pellets.jpg`,
    poidsKg: kg,
    stock: 30,
  };
}

const GRANULES: RayonImporte = {
  categorie: "granules",
  googleCategory: GOOGLE_COMBUSTIBLE,
  produits: [
    granules({
      marque: "Excellent Pellets",
      slugMarque: "excellent-pellets",
      sacs: 65,
      prix: 305,
      atout: "Sciure de résineux issue d'une scierie en circuit court.",
      atoutEn: "Softwood sawdust from a short-supply-chain sawmill.",
      certification: "Certifiés DINplus et ENplus A1 — cendres sous 0,5 %, humidité sous 8 %",
    }),
    granules({
      marque: "Woodstock",
      slugMarque: "woodstock",
      sacs: 78,
      prix: 305,
      atout: "Sciure française non traitée, comprimée sans colle ni liant.",
      atoutEn: "Untreated French sawdust, pressed without glue or binder.",
      certification: "Certifiés NF et DINplus — taux de cendres sous 0,5 %",
    }),
    granules({
      marque: "Valboval",
      slugMarque: "valboval",
      sacs: 65,
      prix: 360,
      atout: "Granulé haut de gamme 100 % résineux, pour les appareils les plus exigeants.",
      atoutEn: "Premium 100% softwood pellet, for the most demanding appliances.",
      certification: "Certifiés DINplus — peu de cendres et de poussières",
    }),
    granules({
      marque: "Total Premium",
      slugMarque: "total-premium",
      sacs: 66,
      prix: 370,
      atout: "Un classique du marché, régulier d'une palette à l'autre.",
      atoutEn: "A market staple, consistent from one pallet to the next.",
      certification: "Certifiés DINplus et ENplus A1",
    }),
    granules({
      marque: "Badger",
      slugMarque: "badger",
      sacs: 66,
      prix: 400,
      atout: "Sciures locales comprimées sans additif chimique.",
      atoutEn: "Local sawdust pressed with no chemical additive.",
      certification: "100 % naturel — faible taux de cendres",
    }),
    granules({
      marque: "Total Energies",
      slugMarque: "total-energies",
      sacs: 66,
      prix: 400,
      atout: "Contrôlés de la production à la livraison.",
      atoutEn: "Checked from production through to delivery.",
      certification: "Certifiés DINplus",
    }),
    granules({
      marque: "Piveteau HP+",
      slugMarque: "piveteau-hp-plus",
      sacs: 72,
      prix: 405,
      atout: "Le taux de cendres le plus bas du rayon, sous 0,3 %.",
      atoutEn: "The lowest ash content in the range, below 0.3%.",
      certification: "Certifiés DINplus — taux de cendres sous 0,3 %",
    }),
    granules({
      marque: "Starforest",
      slugMarque: "starforest",
      sacs: 70,
      prix: 429,
      atout: "Fabriqués en Champagne-Ardenne, 100 % résineux.",
      atoutEn: "Made in Champagne-Ardenne, 100% softwood.",
      certification: "Certifiés DINplus — peu de cendres et de poussières",
    }),
  ],
};

const RAYONS = [BOIS_EN_VRAC, BOIS_SUR_PALETTE, BOIS_COMPRESSE, GRANULES, POELES];

async function main() {
  let crees = 0;
  let majs = 0;

  for (const rayon of RAYONS) {
    const categorie = await prisma.category.findFirst({ where: { slug: rayon.categorie } });
    if (!categorie) {
      throw new Error(`Catégorie « ${rayon.categorie} » introuvable : lancer d'abord la restructuration.`);
    }

    console.log(`\n=== ${rayon.categorie} — ${rayon.produits.length} références ===`);

    for (const produit of rayon.produits) {
      const donnees = {
        categoryId: categorie.id,
        brand: produit.brand,
        name: produit.name,
        nameEn: produit.nameEn,
        sku: reference(produit.slug),
        shortDescription: produit.short,
        shortDescriptionEn: produit.shortEn,
        description: produit.short,
        descriptionEn: produit.shortEn,
        bullets: JSON.stringify(produit.bullets),
        bulletsEn: JSON.stringify(produit.bulletsEn),
        googleProductCategory: rayon.googleCategory,
        shippingWeightGrams: produit.poidsKg * 1000,
        image: produit.image,
        images: JSON.stringify([produit.image]),
        priceCents: Math.round(produit.prix * 100),
        oldPriceCents: produit.prixBarre ? Math.round(produit.prixBarre * 100) : null,
        badge: produit.badge ?? null,
        editorialRating: produit.note ?? null,
        stock: produit.stock,
        active: true,
      };

      const existant = await prisma.product.findUnique({ where: { slug: produit.slug } });
      await prisma.product.upsert({
        where: { slug: produit.slug },
        update: donnees,
        create: { ...donnees, slug: produit.slug },
      });

      if (existant) majs += 1;
      else crees += 1;
      console.log(`  ${existant ? "maj " : "créé"}  ${produit.name}  —  ${produit.prix} €`);
    }
  }

  console.log(`\n${crees} produits créés, ${majs} mis à jour.`);

  const total = await prisma.category.findMany({
    where: { slug: { in: RAYONS.map((r) => r.categorie) } },
    select: { slug: true, label: true, _count: { select: { products: true } } },
  });
  console.log("\n=== Effectif par rayon ===");
  for (const c of total) console.log(`  ${c.label.padEnd(32)} ${c._count.products} produits`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
