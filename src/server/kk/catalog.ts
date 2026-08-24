import { prisma } from "@/server/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import { lireVocabulaire } from "./vocabulaire-tags";
import { pickText, needsTranslation } from "@/server/localizedContent";
import { FAMILLE_PEAU, FAMILLE_PREOCCUPATION } from "@/lib/kk/facettes";
import type { KKProductView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

export type CatalogSort = "pertinence" | "prix-asc" | "prix-desc" | "nouveautes";

/**
 * Produits par page du catalogue.
 *
 * Le découpage se fait en BASE (skip/take), pas en mémoire comme pour les
 * tableaux du back-office : une page de rayon charge des fiches complètes
 * — variantes, avis, images — et en rapatrier soixante pour n'en montrer
 * trente coûte la bande passante et le temps de rendu de trente fiches
 * inutiles, à chaque visite.
 */
export const CATALOG_PAGE_SIZE = 30;

export type CatalogView = {
  group: { slug: string; label: string; intro?: string };
  category?: { slug: string; label: string };
  categories: { slug: string; label: string; count: number }[];
  brands: string[];
  /** Produits de la page courante uniquement. */
  products: KKProductView[];
  /** Total correspondant aux filtres, toutes pages confondues. */
  total: number;
  /** Page affichée, toujours comprise entre 1 et pageCount. */
  page: number;
  pageCount: number;
  pageSize: number;
  /** Rang du premier produit affiché, à partir de 1 (0 si aucun). */
  firstItem: number;
  lastItem: number;
  /**
   * Bornes de prix (FCFA entiers) de tout le rayon — univers, éventuellement
   * restreint à la catégorie — indépendamment des filtres appliqués : elles
   * calibrent le curseur, qui ne doit pas se resserrer à mesure qu'on filtre.
   */
  prixMin: number;
  prixMax: number;
  /**
   * Décompte par option de facette dans la sélection courante, pour afficher
   * un nombre à côté de chaque case avant même de la cocher. Chaque décompte
   * ignore le filtre de SA PROPRE famille (mais tient compte de toutes les
   * autres) : celui d'une marque dit « combien de produits avec cette marque
   * EN PLUS de celles déjà cochées » (union, comme les autres valeurs déjà
   * sélectionnées de la même famille) — pas « combien de produits avec
   * cette seule marque ». Ce n'est donc « combien si je coche CETTE case » que
   * pour la première case cochée d'une famille ; dès la deuxième, le nombre
   * inclut l'union avec celles déjà cochées. C'est voulu : sans cette
   * exclusion de la propre famille, cocher une première valeur en union ferait
   * chuter à zéro le compteur des autres valeurs de la même famille.
   */
  countsByBrand: Record<string, number>;
  countsByPeau: Record<string, number>;
  countsByPreoccupation: Record<string, number>;
};

/**
 * Ordre de tri, avec l'identifiant en départage systématique.
 *
 * Ce second critère n'est pas cosmétique : dès qu'on pagine, un tri ambigu
 * devient faux. Deux produits au même prix — le cas courant sur un catalogue
 * où les prix sont ronds — peuvent sortir dans un ordre différent d'une
 * requête à l'autre ; l'un se retrouve alors en fin de page 1 ET en tête de
 * page 2, pendant qu'un autre n'apparaît nulle part. L'identifiant, unique,
 * fige l'ordre.
 */
function orderByFor(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "prix-asc":
      return [{ priceCents: "asc" }, { id: "asc" }];
    case "prix-desc":
      return [{ priceCents: "desc" }, { id: "asc" }];
    case "nouveautes":
      return [{ createdAt: "desc" }, { id: "asc" }];
    default:
      return [{ createdAt: "asc" }, { id: "asc" }];
  }
}

export type CatalogMeta = {
  group: { slug: string; label: string };
  category?: { slug: string; label: string };
  /** Page effectivement affichée, comprise entre 1 et pageCount. */
  page: number;
  pageCount: number;
};

/**
 * Vue minimale pour `generateMetadata` : de quoi composer un `<title>` et une
 * adresse canonique, rien de plus. `getCatalog` en fait dix-huit fois plus —
 * décomptes par marque et par facette, produits de la page, bornes de prix —
 * pour qu'un `<head>` n'en tire jamais qu'un titre et un lien `canonical`.
 * Mesuré sur ce lot : 37 requêtes pour afficher un rayon (18 pour la page,
 * 18 de plus pour sa métadonnée, dupliquées) sont tombées à 20 en retirant
 * cette redondance — 18 pour la page, 2 ici. `generateMetadata` ne reçoit
 * jamais de filtres (marque, facette, prix) : seule la pagination du rayon
 * NON filtré importe pour son titre et sa canonique.
 */
export async function getCatalogMeta(opts: {
  group: string;
  category?: string;
  page?: number;
  locale: Locale;
}): Promise<CatalogMeta | null> {
  const group = await prisma.group.findUnique({
    where: { slug: opts.group },
    include: { categories: { orderBy: { position: "asc" } } },
  });
  if (!group) return null;

  const traduire = needsTranslation(opts.locale);

  let category: { slug: string; label: string } | undefined;
  if (opts.category) {
    const match = group.categories.find((c) => c.slug === opts.category);
    if (!match) return null;
    category = { slug: match.slug, label: pickText(match.label, traduire ? match.labelEn : undefined) };
  }

  const scope: Prisma.ProductWhereInput = {
    active: true,
    category: {
      group: { slug: opts.group },
      ...(opts.category ? { slug: opts.category } : {}),
    },
  };

  const total = await prisma.product.count({ where: scope });
  const pageCount = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(opts.page ?? 1, 1), pageCount);

  return {
    group: { slug: group.slug, label: pickText(group.label, traduire ? group.labelEn : undefined) },
    category,
    page,
    pageCount,
  };
}

/** Condition « le produit porte au moins une de ces étiquettes ». */
function tagsWhere(tags: string[] | undefined): Prisma.ProductWhereInput | undefined {
  if (!tags || tags.length === 0) return undefined;
  // Guillemets encadrant l'étiquette : un `contains` nu laisserait un préfixe
  // en attraper un autre (« peau_seche » ne doit pas matcher « peau_sechee »).
  return { OR: tags.map((tag) => ({ tags: { contains: `"${tag}"` } })) };
}

/**
 * Vue catalogue pour un univers (et éventuellement une catégorie), avec filtres
 * marque, besoin, facettes (type de peau / préoccupation) et prix, plus tri.
 * Renvoie `null` si l'univers (ou la catégorie) n'existe pas.
 *
 * `besoin`, `peau` et `preoccupation` portent tous sur les étiquettes du
 * Diagnostic Beauté stockées dans `Product.tags` — un tableau JSON sérialisé.
 * `besoin` est l'ancien paramètre (une seule étiquette, lien déjà partagé ou
 * résultat de diagnostic) ; il continue de fonctionner et se combine en ET
 * avec les nouvelles facettes plutôt que de les remplacer.
 *
 * RÈGLE DE COMBINAISON — union DANS une famille, intersection ENTRE familles :
 * `peau` et `preoccupation` sont chacune un OR sur leurs valeurs cochées (voir
 * `tagsWhere`), et les familles renseignées (plus `besoin` et le prix) se
 * combinent en AND. Cocher deux types de peau élargit ; cocher un type de peau
 * ET une préoccupation restreint. C'est la même règle que porte
 * `produitCorrespondFacettes` dans src/lib/kk/facettes.ts, appliquée ici en
 * base plutôt qu'en mémoire.
 */
export async function getCatalog(opts: {
  group: string;
  category?: string;
  brands?: string[];
  besoin?: string;
  peau?: string[];
  preoccupation?: string[];
  /** Bornes de prix en FCFA entiers — jamais de division par 100. */
  prixMin?: number;
  prixMax?: number;
  sort?: CatalogSort;
  /** Page demandée, 1 par défaut. Hors bornes, on ramène à la dernière page. */
  page?: number;
  /** Langue de la page qui affiche le catalogue — voir `toProductView`. */
  locale: Locale;
}): Promise<CatalogView | null> {
  const group = await prisma.group.findUnique({
    where: { slug: opts.group },
    include: { categories: { orderBy: { position: "asc" } } },
  });
  if (!group) return null;

  // Repli identique à `toProductView` : accès direct au champ `*En` déjà
  // chargé sur la ligne (aucun `select` restrictif sur ces requêtes), passé
  // par `pickText` — jamais affiché tel quel.
  const traduire = needsTranslation(opts.locale);

  let category: { slug: string; label: string } | undefined;
  if (opts.category) {
    const match = group.categories.find((c) => c.slug === opts.category);
    if (!match) return null;
    category = { slug: match.slug, label: pickText(match.label, traduire ? match.labelEn : undefined) };
  }

  // Portée : univers, éventuellement restreinte à une catégorie.
  const scope: Prisma.ProductWhereInput = {
    active: true,
    category: {
      group: { slug: opts.group },
      ...(opts.category ? { slug: opts.category } : {}),
    },
  };

  const prixWhere: Prisma.ProductWhereInput | undefined =
    opts.prixMin !== undefined || opts.prixMax !== undefined
      ? {
          priceCents: {
            ...(opts.prixMin !== undefined ? { gte: opts.prixMin } : {}),
            ...(opts.prixMax !== undefined ? { lte: opts.prixMax } : {}),
          },
        }
      : undefined;

  /**
   * Portée filtrée, à l'exclusion optionnelle d'UNE famille — pour les
   * décomptes par option (`countsByBrand`/`countsByPeau`/`countsByPreoccupation`
   * sur `CatalogView`) : le compteur d'une valeur non cochée doit ignorer le
   * filtre de SA PROPRE famille tout en respectant toutes les autres, marque
   * et prix compris. Sans cette exclusion, cocher une première valeur d'une
   * famille en union ferait chuter à zéro le compteur des autres valeurs de
   * la même famille — l'inverse de l'union voulue.
   *
   * Le prix se filtre ici, dans le `where`, jamais après coup : un filtrage en
   * mémoire après la pagination donnerait des pages de tailles inégales.
   */
  const whereFor = (excluding?: "brand" | "peau" | "preoccupation"): Prisma.ProductWhereInput => {
    const and: Prisma.ProductWhereInput[] = [];
    if (opts.besoin) and.push({ tags: { contains: `"${opts.besoin}"` } });
    if (excluding !== "peau") {
      const w = tagsWhere(opts.peau);
      if (w) and.push(w);
    }
    if (excluding !== "preoccupation") {
      const w = tagsWhere(opts.preoccupation);
      if (w) and.push(w);
    }
    return {
      ...scope,
      ...(excluding !== "brand" && opts.brands && opts.brands.length ? { brand: { in: opts.brands } } : {}),
      ...(and.length ? { AND: and } : {}),
      ...(prixWhere ?? {}),
    };
  };

  const where = whereFor();

  // Deux temps, et c'est nécessaire : il faut connaître le total AVANT de
  // décider quelle tranche lire. Sinon un `?page=99` sur un rayon de deux
  // pages renverrait une grille vide au lieu de la dernière page. Le
  // vocabulaire des facettes (nécessaire aux décomptes ci-dessous) ne dépend
  // de rien de tout ça : il part en parallèle.
  const [total, vocabulaire] = await Promise.all([
    prisma.product.count({ where }),
    lireVocabulaire(opts.locale),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(opts.page ?? 1, 1), pageCount);
  const skip = (page - 1) * CATALOG_PAGE_SIZE;

  const clesPeau = vocabulaire.filter((v) => v.family === FAMILLE_PEAU).map((v) => v.key);
  const clesPreoccupation = vocabulaire.filter((v) => v.family === FAMILLE_PREOCCUPATION).map((v) => v.key);

  const [rows, brandRows, brandCounts, categoryCounts, prixAgg, peauCounts, preoccupationCounts] =
    await Promise.all([
      prisma.product.findMany({
        where,
        include: PRODUCT_VIEW_INCLUDE,
        orderBy: orderByFor(opts.sort ?? "pertinence"),
        skip,
        take: CATALOG_PAGE_SIZE,
      }),
      // Marques disponibles dans la portée, indépendamment du filtre courant.
      prisma.product.findMany({
        where: scope,
        select: { brand: true },
        distinct: ["brand"],
        orderBy: { brand: "asc" },
      }),
      // Décompte par marque : `brand` est une colonne native, un seul `groupBy`
      // suffit — contrairement aux facettes, portées par le JSON `tags`.
      prisma.product.groupBy({
        by: ["brand"],
        where: whereFor("brand"),
        _count: { _all: true },
      }),
      // Nombre de produits par catégorie de l'univers.
      prisma.product.groupBy({
        by: ["categoryId"],
        where: { active: true, category: { group: { slug: opts.group } } },
        _count: { _all: true },
      }),
      // Bornes de prix de TOUT le rayon, indépendantes des filtres appliqués :
      // le curseur ne doit pas se resserrer à mesure qu'on filtre.
      prisma.product.aggregate({
        where: scope,
        _min: { priceCents: true },
        _max: { priceCents: true },
      }),
      // Un `groupBy` ne peut pas porter sur une clé à l'intérieur du JSON
      // `tags`. La parade évidente est une requête `count` par option de
      // vocabulaire — c'est ce que faisait cette lecture, soit dix allers-retours
      // pour afficher un rayon, sur une base distante mesurée à 220 ms l'unité.
      //
      // On lit donc la colonne `tags` UNE fois par famille, et on compte en
      // mémoire. Deux requêtes au lieu de dix, pour un résultat identique : le
      // `contains: '"cle"'` de Prisma cherchait déjà le jeton entre guillemets,
      // ce que l'appartenance au tableau décodé fait plus sûrement encore.
      //
      // La lecture ramène une seule colonne, jamais les fiches : un rayon de
      // dix mille produits reste une réponse légère, là où dix comptages
      // resteraient dix allers-retours quoi qu'il arrive.
      prisma.product.findMany({ where: whereFor("peau"), select: { tags: true } }),
      prisma.product.findMany({ where: whereFor("preoccupation"), select: { tags: true } }),
    ]);

  /** Compte, parmi des listes de tags déjà lues, ceux qui portent chaque clé. */
  function compterTags(lignes: { tags: string }[], cles: string[]): Record<string, number> {
    const compte: Record<string, number> = Object.fromEntries(cles.map((cle) => [cle, 0]));
    for (const ligne of lignes) {
      let portes: unknown;
      try {
        portes = JSON.parse(ligne.tags || "[]");
      } catch {
        // Une ligne au JSON illisible ne doit pas vider tout un rayon de ses
        // décomptes : on l'ignore, comme le faisait le `contains` avant elle.
        continue;
      }
      if (!Array.isArray(portes)) continue;
      for (const tag of portes) {
        if (typeof tag === "string" && tag in compte) compte[tag] += 1;
      }
    }
    return compte;
  }

  const countByCategoryId = new Map(categoryCounts.map((c) => [c.categoryId, c._count._all]));
  const countsByBrand = Object.fromEntries(brandCounts.map((b) => [b.brand, b._count._all]));
  const countsByPeau = compterTags(peauCounts, clesPeau);
  const countsByPreoccupation = compterTags(preoccupationCounts, clesPreoccupation);

  return {
    group: { slug: group.slug, label: pickText(group.label, traduire ? group.labelEn : undefined) },
    category,
    categories: group.categories.map((c) => ({
      slug: c.slug,
      label: pickText(c.label, traduire ? c.labelEn : undefined),
      count: countByCategoryId.get(c.id) ?? 0,
    })),
    brands: brandRows.map((b) => b.brand),
    products: rows.map((row, index) => toProductView(row, opts.locale, index)),
    total,
    page,
    pageCount,
    pageSize: CATALOG_PAGE_SIZE,
    firstItem: total === 0 ? 0 : skip + 1,
    lastItem: skip + rows.length,
    prixMin: prixAgg._min.priceCents ?? 0,
    prixMax: prixAgg._max.priceCents ?? 0,
    countsByBrand,
    countsByPeau,
    countsByPreoccupation,
  };
}
