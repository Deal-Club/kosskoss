import { prisma } from "@/server/prisma";
import { cleMarque, slugMarque } from "@/lib/kk/marques";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import { CATALOG_PAGE_SIZE } from "./catalog";
import { pickText } from "@/server/localizedContent";
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

/**
 * Slugs des marques ayant réellement une page — même filtre que
 * `marqueVitrineParSlug` : actives, avec au moins un produit actif. Alimente
 * `src/app/sitemap.ts`, qui ne déclare que ce qui a de la matière, comme il
 * le fait déjà pour les rubriques et auteurs du Journal.
 */
export async function listerSlugsMarquesVitrine(): Promise<string[]> {
  const rows = await prisma.brand.findMany({
    where: { active: true, products: { some: { active: true } } },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  return rows.map((row) => row.slug);
}

/** Marque telle que présentée sur sa page de vitrine, avec ses produits actifs. */
export interface MarqueVitrine {
  slug: string;
  name: string;
  description: string;
  logo: string;
  /** Produits de la page courante uniquement — voir `CATALOG_PAGE_SIZE`. */
  products: KKProductView[];
  /** Total de produits actifs de la marque, toutes pages confondues. */
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  firstItem: number;
  lastItem: number;
}

/**
 * Marque de vitrine par slug. `null` si elle n'existe pas, si elle est
 * inactive, ou si elle n'a plus aucun produit actif — même règle que sur le
 * listing : une page de marque vide déçoit plus qu'une absence, et fait sortir
 * la fiche du référencement plutôt que de la laisser à vide.
 *
 * Paginée comme une page de catégorie (`getCatalog`, src/server/kk/catalog.ts) :
 * une marque à cinq cents produits rendrait cinq cents vignettes sur une seule
 * page sans ce découpage. Même gabarit — `CATALOG_PAGE_SIZE`, comptage puis
 * lecture de la tranche, page hors bornes ramenée à la dernière.
 */
export async function marqueVitrineParSlug(
  slug: string,
  locale: Locale,
  page = 1,
): Promise<MarqueVitrine | null> {
  const marque = await prisma.brand.findUnique({ where: { slug } });
  if (!marque || !marque.active) return null;

  const where = { brandId: marque.id, active: true };
  const total = await prisma.product.count({ where });
  if (total === 0) return null;

  const pageCount = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const pageEffective = Math.min(Math.max(page, 1), pageCount);
  const skip = (pageEffective - 1) * CATALOG_PAGE_SIZE;

  const rows = await prisma.product.findMany({
    where,
    include: PRODUCT_VIEW_INCLUDE,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip,
    take: CATALOG_PAGE_SIZE,
  });

  return {
    slug: marque.slug,
    name: pickText(marque.name, locale === "en" ? marque.nameEn : undefined),
    description: pickText(marque.description, locale === "en" ? marque.descriptionEn : undefined),
    logo: marque.logo,
    products: rows.map((row, index) => toProductView(row, locale, index)),
    total,
    page: pageEffective,
    pageCount,
    pageSize: CATALOG_PAGE_SIZE,
    firstItem: total === 0 ? 0 : skip + 1,
    lastItem: skip + rows.length,
  };
}

/**
 * Cherche, parmi les marques existantes, celle qui partage la clé de
 * rapprochement du nom donné — « Nivea » et « Nivéa » sont la même clé, la
 * seule contrainte d'unicité de la base ne les distinguerait pas puisqu'elle
 * est sensible à la casse et aux accents. `ignoreId` exclut la marque qu'on
 * modifie elle-même de la recherche.
 */
async function marqueEnConflit(name: string, ignoreId?: string) {
  const cle = cleMarque(name);
  const existantes = await prisma.brand.findMany({
    where: ignoreId ? { id: { not: ignoreId } } : undefined,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return existantes.find((marque) => cleMarque(marque.name) === cle);
}

export async function creerMarque(input: MarqueInput): Promise<MarqueRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Le nom de la marque est obligatoire.");

  const conflit = await marqueEnConflit(name);
  if (conflit) {
    throw new Error(
      `Une marque très proche existe déjà : « ${conflit.name} ». Réutilisez-la plutôt que d'en créer une seconde.`,
    );
  }

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

  const renomme = name !== current.name;
  if (renomme) {
    const conflit = await marqueEnConflit(name, id);
    if (conflit) {
      throw new Error(
        `Une marque très proche existe déjà : « ${conflit.name} ». Réutilisez-la plutôt que de renommer celle-ci à l'identique.`,
      );
    }
  }

  // Le slug ne suit pas automatiquement un changement de nom : le rederiver à
  // chaque modification romprait des adresses déjà publiées. Il ne change que
  // sur demande explicite, et reste alors unique.
  const slug = patch.slug?.trim() ? await slugUnique(slugMarque(patch.slug), id) : current.slug;

  // Une seule transaction : soit la marque ET ses produits changent de
  // libellé ensemble, soit rien ne bouge. Sans ça, un crash entre les deux
  // écritures laisserait une marque déjà renommée avec des produits qui
  // affichent encore l'ancien nom — exactement le défaut que cette écriture
  // corrige.
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.brand.update({
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

    // ── PRODUIT VIVANT, LIGNE DE COMMANDE FIGÉE ──────────────────────────
    //
    // `Product.brand` est un libellé recopié pour l'affichage, mais le
    // produit reste rattaché à sa marque par `brandId` : il est vivant, donc
    // son libellé doit suivre le nom courant de sa marque, comme le titre
    // d'une fiche suit le nom qu'on lui a donné. Ne pas le faire laisserait
    // les fiches déjà rattachées afficher l'ancien nom sous un titre de page
    // qui, lui, aurait changé — et le prochain import recréerait même une
    // DEUXIÈME marque pour l'ancienne graphie, jamais réparée depuis.
    //
    // `OrderItem.brand`, à l'inverse, NE DOIT JAMAIS être touché ici : une
    // commande est un document historique, elle décrit ce que le client a
    // acheté au moment de l'achat, sous le nom qu'elle portait alors. La
    // aligner sur le nom actuel de la marque falsifierait cette photographie.
    // Si quelqu'un « corrige » l'un en croyant l'aligner sur l'autre, c'est
    // ce paragraphe qu'il faut relire.
    if (renomme) {
      await tx.product.updateMany({ where: { brandId: id }, data: { brand: name } });
    }

    return updated;
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

  // `orderBy` explicite : sans lui, deux marques qui partagent une clé de
  // rapprochement (cas normalement empêché à la création — voir
  // `marqueEnConflit` — mais qu'une base plus ancienne peut déjà porter)
  // laisseraient l'ordre physique de la table décider laquelle des deux
  // reçoit les produits, un ordre qui peut changer d'une exécution à
  // l'autre. La plus ancienne l'emporte, pour rester déterministe.
  const marquesExistantes = await prisma.brand.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  // Construit à la main plutôt que via `new Map(marques.map(...))` : ce
  // dernier garderait la DERNIÈRE entrée d'une clé dupliquée, donc la plus
  // récente — l'inverse de ce que l'`orderBy` ci-dessus doit garantir.
  const parCle = new Map<string, (typeof marquesExistantes)[number]>();
  for (const marque of marquesExistantes) {
    const cle = cleMarque(marque.name);
    if (!parCle.has(cle)) parCle.set(cle, marque);
  }

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
    //
    // Le test porte sur le NOMBRE DE GRAPHIES OBSERVÉES DANS CE LOT
    // (`graphies.length > 1`), pas sur la seule présence d'une graphie
    // différente du nom retenu par la marque. Une marque a pu être renommée
    // au back-office (`modifierMarque`) sans que le catalogue ait jamais
    // porté qu'une seule graphie : rattacher cette unique graphie à une
    // marque dont le nom diffère pour une autre raison n'est pas une fusion,
    // et ne doit pas être annoncé comme telle.
    const graphies = [...new Set(aRattacher.map((ligne) => ligne.brand.trim()))];
    if (graphies.length > 1) {
      const variantes = graphies.filter((nom) => nom !== marque!.name);
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
