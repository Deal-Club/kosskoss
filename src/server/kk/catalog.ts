import { prisma } from "@/server/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import { pickText, needsTranslation } from "@/server/localizedContent";
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

/**
 * Vue catalogue pour un univers (et éventuellement une catégorie), avec filtres
 * marque, besoin et tri. Renvoie `null` si l'univers (ou la catégorie) n'existe
 * pas.
 *
 * `besoin` porte sur les étiquettes du Diagnostic Beauté stockées dans
 * `Product.tags` — un tableau JSON sérialisé. Un `contains` sur la chaîne
 * suffit : les guillemets encadrant l'étiquette évitent qu'un préfixe en
 * attrape un autre (« peau_seche » ne matche pas « peau_sechee »).
 */
export async function getCatalog(opts: {
  group: string;
  category?: string;
  brands?: string[];
  besoin?: string;
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

  const where: Prisma.ProductWhereInput = {
    ...scope,
    ...(opts.brands && opts.brands.length ? { brand: { in: opts.brands } } : {}),
    ...(opts.besoin ? { tags: { contains: `"${opts.besoin}"` } } : {}),
  };

  // Deux temps, et c'est nécessaire : il faut connaître le total AVANT de
  // décider quelle tranche lire. Sinon un `?page=99` sur un rayon de deux
  // pages renverrait une grille vide au lieu de la dernière page.
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(opts.page ?? 1, 1), pageCount);
  const skip = (page - 1) * CATALOG_PAGE_SIZE;

  const [rows, brandRows, counts] = await Promise.all([
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
    // Nombre de produits par catégorie de l'univers.
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { active: true, category: { group: { slug: opts.group } } },
      _count: { _all: true },
    }),
  ]);

  const countByCategoryId = new Map(counts.map((c) => [c.categoryId, c._count._all]));

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
  };
}
