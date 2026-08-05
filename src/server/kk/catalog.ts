import { prisma } from "@/server/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { KKProductView, KKTone, KKBadge } from "@/types/kk";

const TONES: KKTone[] = ["clay", "sand", "teal", "rose"];

function toBadge(value: string | null): KKBadge {
  return value === "bestseller" || value === "nouveau" ? value : null;
}

export type CatalogSort = "pertinence" | "prix-asc" | "prix-desc" | "nouveautes";

export type CatalogView = {
  group: { slug: string; label: string; intro?: string };
  category?: { slug: string; label: string };
  categories: { slug: string; label: string; count: number }[];
  brands: string[];
  products: KKProductView[];
  total: number;
};

function orderByFor(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "prix-asc":
      return { priceCents: "asc" };
    case "prix-desc":
      return { priceCents: "desc" };
    case "nouveautes":
      return { createdAt: "desc" };
    default:
      return { createdAt: "asc" };
  }
}

/**
 * Vue catalogue pour un univers (et éventuellement une catégorie), avec filtres
 * marque et tri. Renvoie `null` si l'univers (ou la catégorie) n'existe pas.
 */
export async function getCatalog(opts: {
  group: string;
  category?: string;
  brands?: string[];
  sort?: CatalogSort;
}): Promise<CatalogView | null> {
  const group = await prisma.group.findUnique({
    where: { slug: opts.group },
    include: { categories: { orderBy: { position: "asc" } } },
  });
  if (!group) return null;

  let category: { slug: string; label: string } | undefined;
  if (opts.category) {
    const match = group.categories.find((c) => c.slug === opts.category);
    if (!match) return null;
    category = { slug: match.slug, label: match.label };
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
  };

  const [rows, brandRows, counts] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { include: { group: true } } },
      orderBy: orderByFor(opts.sort ?? "pertinence"),
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
    group: { slug: group.slug, label: group.label },
    category,
    categories: group.categories.map((c) => ({
      slug: c.slug,
      label: c.label,
      count: countByCategoryId.get(c.id) ?? 0,
    })),
    brands: brandRows.map((b) => b.brand),
    products: rows.map((p, index) => ({
      id: p.id,
      brand: p.brand,
      name: p.name,
      priceFcfa: p.priceCents,
      oldPriceFcfa: p.oldPriceCents ?? undefined,
      badge: toBadge(p.badge),
      tone: TONES[index % TONES.length],
      image: p.image,
      href: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
    })),
    total: rows.length,
  };
}
