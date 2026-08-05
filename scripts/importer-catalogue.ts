/**
 * Importe un lot de fiches produits dans le catalogue, visuels compris.
 *
 * Les visuels sont d'abord envoyés sur Cloudinary. Si les identifiants sont
 * absents ou refusés, ils sont recopiés dans `public/images/produkte/` et
 * servis par le site lui-même : le catalogue reste affichable, et un simple
 * relancement bascule vers Cloudinary une fois la clé corrigée.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/importer-catalogue.ts <lot>
 * où <lot> vaut « waschmaschinen » ou « kaffeemaschinen ».
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/server/prisma";
import { uploadImage, isCloudinaryConfigured } from "../src/server/cloudinary";

interface FicheProduit {
  brand: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  bullets: string[];
  gtin: string | null;
  mpn: string | null;
  energyEfficiencyClass: string | null;
  priceCents: number;
  oldPriceCents: number | null;
  badge: string | null;
  editorialRating: number | null;
  stock: number;
  shippingWeightGrams: number | null;
  images: string[];
}

interface Lot {
  /** Slug de la catégorie visée, tel qu'il figure en base. */
  categorie: string;
  /** Identifiant de la taxonomie Google, exigé par Merchant Center. */
  googleCategory: string;
  /** Dossier de travail contenant les fiches et les visuels déjà récupérés. */
  dossier: string;
}

const LOTS: Record<string, Lot> = {
  // Maison et jardin > Électroménager > Lavage et séchage > Lave-linge
  waschmaschinen: { categorie: "waschmaschinen", googleCategory: "2549", dossier: ".tmp-scrape" },
  // Maison et jardin > Cuisine et salle à manger > Appareils de cuisine > Machines à café
  kaffeemaschinen: { categorie: "kaffeemaschinen", googleCategory: "736", dossier: ".tmp-kaffee" },
  // Électronique > Communications > Téléphonie > Téléphones mobiles
  smartphones: { categorie: "smartphones", googleCategory: "267", dossier: ".tmp-cat/smartphones" },
  // Maison et jardin > Cuisine et salle à manger > Appareils de cuisine > Lave-vaisselle
  geschirrspueler: { categorie: "geschirrspueler", googleCategory: "680", dossier: ".tmp-cat/geschirrspueler" },
  // Électronique > Vidéo > Téléviseurs
  fernseher: { categorie: "fernseher", googleCategory: "404", dossier: ".tmp-cat/fernseher" },
  // Maison et jardin > Cuisine et salle à manger > Appareils de cuisine > Fours
  "backoefen-herde": { categorie: "backoefen-herde", googleCategory: "683", dossier: ".tmp-cat/backoefen" },
  // Maison et jardin > Cuisine et salle à manger > Appareils de cuisine > Robots de cuisine
  kuechenmaschinen: { categorie: "kuechenmaschinen", googleCategory: "505666", dossier: ".tmp-cat/kuechenmaschinen" },
  // Maison et jardin > Électroménager > Aspirateurs
  staubsauger: { categorie: "staubsauger", googleCategory: "619", dossier: ".tmp-cat/staubsauger" },
  // Vêtements et accessoires > Bijoux > Montres
  smartwatches: { categorie: "smartwatches", googleCategory: "201", dossier: ".tmp-cat/smartwatches" },
  // Électronique > Ordinateurs > Ordinateurs portables
  computer: { categorie: "computer", googleCategory: "328", dossier: ".tmp-cat/computer" },
  // Médias > Jeux vidéo / consoles
  videospiele: { categorie: "videospiele", googleCategory: "1279", dossier: ".tmp-cat/videospiele" },
  // Loisirs > Modélisme et radiocommande > Drones
  drohnen: { categorie: "drohnen", googleCategory: "5825", dossier: ".tmp-cat/drohnen" },
  // Maison et jardin > Chauffage, ventilation et climatisation > Climatiseurs
  klimageraete: { categorie: "klimageraete", googleCategory: "605", dossier: ".tmp-cat/klimageraete" },
};

const DOSSIER_CLOUDINARY = "hausgeraete-pfeffer/products";
/** Dossier public servi tel quel par Next : le chemin en base commence par « / ». */
const DOSSIER_PUBLIC = path.join(process.cwd(), "public", "images", "produkte");
/** En dessous de ce poids, le fichier est un pictogramme, pas une photo produit. */
const TAILLE_MIN_OCTETS = 9000;

async function lireJson<T>(fichier: string): Promise<T> {
  return JSON.parse(await readFile(fichier, "utf-8")) as T;
}

/** Vérifie que Cloudinary accepte réellement nos identifiants, sans rien envoyer. */
async function cloudinaryUtilisable(): Promise<boolean> {
  if (!isCloudinaryConfigured()) return false;
  try {
    const { v2 } = await import("cloudinary");
    await v2.api.ping({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      api_key: process.env.CLOUDINARY_API_KEY?.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
    });
    return true;
  } catch (erreur) {
    const message = (erreur as { error?: { message?: string } }).error?.message ?? "refus";
    console.warn(`Cloudinary indisponible (${message}) — les visuels seront servis depuis public/.`);
    return false;
  }
}

async function main(): Promise<void> {
  const nomLot = process.argv[2];
  const lot = LOTS[nomLot];
  if (!lot) {
    throw new Error(`Lot inconnu. Valeurs acceptées : ${Object.keys(LOTS).join(", ")}`);
  }

  const base = path.join(process.cwd(), lot.dossier);
  const fiches = await lireJson<FicheProduit[]>(path.join(base, "produits-finaux.json"));

  // Visuels déjà téléchargés, indexés par slug de produit. Absent pour un lot
  // dont les images n'ont pas encore été récupérées : on retombe alors sur les
  // fichiers nommés « <slug>-1.webp ».
  let manifeste: Record<string, string[]> = {};
  try {
    manifeste = await lireJson(path.join(base, "images-manifeste.json"));
  } catch {
    manifeste = Object.fromEntries(fiches.map((f) => [f.slug, [`${f.slug}-1.webp`]]));
  }

  const categorie = await prisma.category.findFirst({
    where: { slug: lot.categorie },
    select: { id: true, label: true },
  });
  if (!categorie) throw new Error(`Catégorie « ${lot.categorie} » introuvable en base.`);

  const versCloudinary = await cloudinaryUtilisable();
  await mkdir(DOSSIER_PUBLIC, { recursive: true });

  const cheminCache = path.join(base, "cloudinary-cache.json");
  let cache: Record<string, string> = {};
  try {
    cache = await lireJson(cheminCache);
  } catch {
    cache = {};
  }

  console.log(`Catégorie : ${categorie.label}`);
  console.log(`Destination des visuels : ${versCloudinary ? "Cloudinary" : "public/images/produkte"}`);
  console.log(`${fiches.length} fiches à importer.\n`);

  let crees = 0;
  let majs = 0;
  let visuels = 0;
  const sansVisuel: string[] = [];

  for (const [index, fiche] of fiches.entries()) {
    const fichiers = manifeste[fiche.slug] ?? [];
    const urls: string[] = [];

    for (const nom of fichiers) {
      const source = path.join(base, "images", nom);

      // Une image déjà sur Cloudinary n'est jamais renvoyée.
      if (versCloudinary && cache[nom]) {
        urls.push(cache[nom]);
        continue;
      }

      let octets: Buffer;
      try {
        octets = await readFile(source);
      } catch {
        continue; // fichier annoncé par le manifeste mais absent du disque
      }
      if (octets.byteLength < TAILLE_MIN_OCTETS) continue;

      if (versCloudinary) {
        try {
          const envoyee = await uploadImage(octets, {
            filename: nom.replace(/\.[^.]+$/, ""),
            folder: DOSSIER_CLOUDINARY,
          });
          urls.push(envoyee.url);
          cache[nom] = envoyee.url;
          await writeFile(cheminCache, JSON.stringify(cache, null, 2));
          visuels += 1;
        } catch (erreur) {
          console.warn(`    envoi refusé (${nom}) : ${(erreur as Error).message.slice(0, 70)}`);
        }
      } else {
        await copyFile(source, path.join(DOSSIER_PUBLIC, nom));
        urls.push(`/images/produkte/${nom}`);
        visuels += 1;
      }
    }

    if (urls.length === 0) sansVisuel.push(`${fiche.brand} ${fiche.mpn ?? fiche.slug}`);

    const donnees = {
      categoryId: categorie.id,
      brand: fiche.brand,
      name: fiche.name,
      sku: fiche.sku,
      shortDescription: fiche.shortDescription,
      description: fiche.description,
      bullets: JSON.stringify(fiche.bullets),
      gtin: fiche.gtin,
      mpn: fiche.mpn,
      condition: "new",
      googleProductCategory: lot.googleCategory,
      shippingWeightGrams: fiche.shippingWeightGrams,
      energyEfficiencyClass: fiche.energyEfficiencyClass,
      image: urls[0] ?? null,
      // `image` porte la vignette ; la galerie ne garde que les vues
      // complémentaires, dans la limite des 8 admises par le back-office.
      images: JSON.stringify(urls.slice(1, 9)),
      priceCents: fiche.priceCents,
      oldPriceCents: fiche.oldPriceCents,
      badge: fiche.badge,
      editorialRating: fiche.editorialRating,
      stock: fiche.stock,
      active: true,
    };

    const existant = await prisma.product.findUnique({ where: { slug: fiche.slug } });
    if (existant) {
      await prisma.product.update({ where: { slug: fiche.slug }, data: donnees });
      majs += 1;
    } else {
      await prisma.product.create({ data: { ...donnees, slug: fiche.slug } });
      crees += 1;
    }

    console.log(
      `[${index + 1}/${fiches.length}] ${fiche.brand} ${fiche.mpn ?? ""} — ${urls.length} visuel(s), ${existant ? "mis à jour" : "créé"}`,
    );
  }

  console.log(`\n${crees} créés, ${majs} mis à jour, ${visuels} visuels publiés.`);
  if (sansVisuel.length) console.log(`Sans visuel : ${sansVisuel.join(", ")}`);
  if (!versCloudinary) {
    console.log(
      "\nLes visuels sont servis depuis public/. Corrigez CLOUDINARY_API_SECRET puis relancez\n" +
        "cette commande pour les basculer sur le CDN — les fiches seront mises à jour en place.",
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erreur) => {
    console.error(erreur);
    await prisma.$disconnect();
    process.exit(1);
  });
