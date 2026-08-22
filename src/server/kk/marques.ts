import { prisma } from "@/server/prisma";
import { cleMarque, slugMarque } from "@/lib/kk/marques";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import type { KKProductView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

/**
 * Lecture, écriture et import des marques.
 *
 * ── LE RISQUE, NOMMÉ ─────────────────────────────────────────────────────────
 *
 * `importerMarquesDuCatalogue` tourne sur le catalogue réel et fond des
 * écritures différentes en une seule marque. Un rapprochement trop large
 * fusionnerait deux marques réellement distinctes, et des produits
 * changeraient de marque sans que personne ne s'en aperçoive.
 *
 * C'est pourquoi tout rapprochement — ici comme dans le rattachement — passe
 * par `cleMarque` (src/lib/kk/marques.ts) et RIEN D'AUTRE : la casse et les
 * accents sont ignorés parce qu'une saisie au clavier les fait varier sans
 * intention, mais les espaces internes et la ponctuation restent significatifs.
 * « La Roche Posay » et « LaRochePosay » pourraient être deux gammes
 * distinctes ; ce module ne décide jamais à leur place.
 */

export interface MarqueRecord {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  logo: string;
  position: number;
  active: boolean;
  /** Produits actuellement rattachés — actifs ou non. */
  productCount: number;
}

export interface MarqueInput {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  logo?: string;
  position?: number;
  active?: boolean;
  /** Slug explicite. Non fourni, il est dérivé du nom et rendu unique. */
  slug?: string;
}

export interface CompteRenduImport {
  /** Marques créées lors de cette exécution, par nom. */
  creees: string[];
  /** Écritures différentes rattachées à une même marque, à faire voir. */
  fusionnees: { conservee: string; variantes: string[] }[];
  /** Produits dont le rattachement vient d'être fait. */
  produitsRattaches: number;
  /** Produits déjà rattachés avant cette exécution — pour mesurer l'idempotence. */
  produitsDejaRattaches: number;
}

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  logo: string;
  position: number;
  active: boolean;
  _count: { products: number };
};

const avecCompte = { _count: { select: { products: true } } } as const;

function versMarqueRecord(row: BrandRow): MarqueRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn,
    description: row.description,
    descriptionEn: row.descriptionEn,
    logo: row.logo,
    position: row.position,
    active: row.active,
    productCount: row._count.products,
  };
}

/** Rend un slug unique parmi les marques, en suffixant -2, -3… en cas de collision. */
async function slugUnique(base: string, ignoreId?: string): Promise<string> {
  const racine = base || "marque";
  let candidat = racine;
  let suffixe = 2;
  for (;;) {
    const existante = await prisma.brand.findUnique({ where: { slug: candidat } });
    if (!existante || existante.id === ignoreId) return candidat;
    candidat = `${racine}-${suffixe}`;
    suffixe += 1;
  }
}

export async function listerMarques(options?: {
  seulementActives?: boolean;
}): Promise<MarqueRecord[]> {
  const rows = await prisma.brand.findMany({
    where: options?.seulementActives ? { active: true } : undefined,
    include: avecCompte,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return rows.map(versMarqueRecord);
}

export async function marqueParSlug(slug: string): Promise<MarqueRecord | null> {
  const row = await prisma.brand.findUnique({ where: { slug }, include: avecCompte });
  return row ? versMarqueRecord(row) : null;
}

/** Repli sur le français quand la traduction anglaise est vide — même règle que pour les catégories. */
function pickMarqueText(fr: string, en: string, locale: Locale): string {
  return locale === "en" && en.trim().length > 0 ? en : fr;
}

/** Marque telle que présentée sur sa page de vitrine, avec ses produits actifs. */
export interface MarqueVitrine {
  slug: string;
  name: string;
  description: string;
  logo: string;
  products: KKProductView[];
}

/**
 * Marque de vitrine par slug. `null` si elle n'existe pas, si elle est
 * inactive, ou si elle n'a plus aucun produit actif — même règle que sur le
 * listing : une page de marque vide déçoit plus qu'une absence, et fait sortir
 * la fiche du référencement plutôt que de la laisser à vide.
 */
export async function marqueVitrineParSlug(
  slug: string,
  locale: Locale,
): Promise<MarqueVitrine | null> {
  const row = await prisma.brand.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        include: PRODUCT_VIEW_INCLUDE,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!row || !row.active || row.products.length === 0) return null;

  return {
    slug: row.slug,
    name: pickMarqueText(row.name, row.nameEn, locale),
    description: pickMarqueText(row.description, row.descriptionEn, locale),
    logo: row.logo,
    products: row.products.map((p) => toProductView(p)),
  };
}

export async function creerMarque(input: MarqueInput): Promise<MarqueRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Le nom de la marque est obligatoire.");

  const base = input.slug?.trim() ? slugMarque(input.slug) : slugMarque(name);
  const slug = await slugUnique(base);
  const position = input.position ?? (await prisma.brand.count());

  const row = await prisma.brand.create({
    data: {
      slug,
      name,
      nameEn: input.nameEn ?? "",
      description: input.description ?? "",
      descriptionEn: input.descriptionEn ?? "",
      logo: input.logo ?? "",
      position,
      active: input.active ?? true,
    },
    include: avecCompte,
  });
  return versMarqueRecord(row);
}

export async function modifierMarque(
  id: string,
  patch: Partial<MarqueInput>,
): Promise<MarqueRecord | undefined> {
  const current = await prisma.brand.findUnique({ where: { id } });
  if (!current) return undefined;

  const name = patch.name !== undefined ? patch.name.trim() : current.name;
  if (!name) throw new Error("Le nom de la marque est obligatoire.");

  // Le slug ne suit pas automatiquement un changement de nom : le rederiver à
  // chaque modification romprait des adresses déjà publiées. Il ne change que
  // sur demande explicite, et reste alors unique.
  const slug = patch.slug?.trim() ? await slugUnique(slugMarque(patch.slug), id) : current.slug;

  const row = await prisma.brand.update({
    where: { id },
    data: {
      name,
      slug,
      nameEn: patch.nameEn ?? undefined,
      description: patch.description ?? undefined,
      descriptionEn: patch.descriptionEn ?? undefined,
      logo: patch.logo ?? undefined,
      position: patch.position ?? undefined,
      active: patch.active ?? undefined,
    },
    include: avecCompte,
  });
  return versMarqueRecord(row);
}

export async function supprimerMarque(id: string): Promise<boolean> {
  const current = await prisma.brand.findUnique({ where: { id } });
  if (!current) return false;
  // `onDelete: SetNull` sur Product.marque : les produits gardent leur
  // libellé et perdent seulement leur rattachement, sans être supprimés.
  await prisma.brand.delete({ where: { id } });
  return true;
}

/**
 * Rattache les produits à une marque, en créant celles qui manquent.
 *
 * Idempotent : les produits déjà rattachés (brandId non nul) ne sont ni
 * touchés ni recomptés en tant que nouveaux, et les marques déjà présentes
 * (retrouvées par `cleMarque`) ne sont jamais recréées. Relancer l'import ne
 * doit donc plus rien créer, ce qui permet d'en faire un simple bouton.
 */
export async function importerMarquesDuCatalogue(): Promise<CompteRenduImport> {
  const produits = await prisma.product.findMany({
    select: { id: true, brand: true, brandId: true },
  });

  // Regroupement par CLÉ DE RAPPROCHEMENT — jamais par égalité stricte ni par
  // `slugify`, qui écraserait des différences peut-être volontaires.
  const groupes = new Map<string, { id: string; brand: string; brandId: string | null }[]>();
  for (const produit of produits) {
    const nom = produit.brand.trim();
    if (!nom) continue; // une marque vide n'est jamais créée
    const cle = cleMarque(nom);
    if (!cle) continue;
    const liste = groupes.get(cle) ?? [];
    liste.push(produit);
    groupes.set(cle, liste);
  }

  const marquesExistantes = await prisma.brand.findMany();
  const parCle = new Map(marquesExistantes.map((marque) => [cleMarque(marque.name), marque]));

  const compteRendu: CompteRenduImport = {
    creees: [],
    fusionnees: [],
    produitsRattaches: 0,
    produitsDejaRattaches: 0,
  };

  for (const [cle, lignes] of groupes) {
    const aRattacher = lignes.filter((ligne) => !ligne.brandId);
    compteRendu.produitsDejaRattaches += lignes.length - aRattacher.length;
    if (aRattacher.length === 0) continue;

    let marque = parCle.get(cle);

    if (!marque) {
      // Nom canonique retenu : la graphie portée par le plus de produits — à
      // égalité, l'ordre alphabétique tranche pour rester déterministe d'un
      // import à l'autre.
      const occurrences = new Map<string, number>();
      for (const ligne of aRattacher) {
        const nom = ligne.brand.trim();
        occurrences.set(nom, (occurrences.get(nom) ?? 0) + 1);
      }
      const [nomCanonique] = [...occurrences.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"),
      )[0];

      const slug = await slugUnique(slugMarque(nomCanonique));
      marque = await prisma.brand.create({
        data: { slug, name: nomCanonique, position: await prisma.brand.count() },
      });
      parCle.set(cle, marque);
      compteRendu.creees.push(marque.name);
    }

    // Écritures distinctes réellement fondues par cette exécution — celles
    // déjà rattachées lors d'une exécution précédente ne comptent plus.
    const variantes = [...new Set(aRattacher.map((ligne) => ligne.brand.trim()))].filter(
      (nom) => nom !== marque!.name,
    );
    if (variantes.length > 0) {
      compteRendu.fusionnees.push({ conservee: marque.name, variantes });
    }

    await prisma.product.updateMany({
      where: { id: { in: aRattacher.map((ligne) => ligne.id) } },
      data: { brandId: marque.id },
    });
    compteRendu.produitsRattaches += aRattacher.length;
  }

  return compteRendu;
}
