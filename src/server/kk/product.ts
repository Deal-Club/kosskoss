import { prisma } from "@/server/prisma";
import type { KKProductView, KKTone, KKBadge } from "@/types/kk";

const TONES: KKTone[] = ["clay", "sand", "teal", "rose"];

function toBadge(value: string | null): KKBadge {
  return value === "bestseller" || value === "nouveau" ? value : null;
}

/** Les champs `bullets`/`images` sont des String JSON (défaut "[]"). */
function parseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const v: unknown = JSON.parse(value);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type KKVariant = {
  id: string;
  label: string;
  priceFcfa: number;
  oldPriceFcfa?: number;
};

export type KKProductDetail = {
  id: string;
  brand: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  bullets: string[];
  priceFcfa: number;
  oldPriceFcfa?: number;
  badge: KKBadge;
  stock: number;
  image?: string | null;
  images: string[];
  group: { slug: string; label: string };
  category: { slug: string; label: string };
  variants: KKVariant[];
  href: string;
};

/** Fiche produit complète, résolue par univers/catégorie/slug. `null` si absente. */
export async function getProductDetail(
  group: string,
  category: string,
  slug: string,
): Promise<KKProductDetail | null> {
  const p = await prisma.product.findFirst({
    where: {
      slug,
      active: true,
      category: { slug: category, group: { slug: group } },
    },
    include: {
      category: { include: { group: true } },
      variants: { where: { active: true }, orderBy: { position: "asc" } },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    bullets: parseStringArray(p.bullets),
    priceFcfa: p.priceCents,
    oldPriceFcfa: p.oldPriceCents ?? undefined,
    badge: toBadge(p.badge),
    stock: p.stock,
    image: p.image,
    images: parseStringArray(p.images),
    group: { slug: p.category.group.slug, label: p.category.group.label },
    category: { slug: p.category.slug, label: p.category.label },
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      priceFcfa: v.priceCents,
      oldPriceFcfa: v.oldPriceCents ?? undefined,
    })),
    href: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
  };
}

/** Produits de la même catégorie, hors produit courant. */
export async function getRelatedProducts(
  categorySlug: string,
  excludeId: string,
  limit = 4,
): Promise<KKProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, category: { slug: categorySlug }, id: { not: excludeId } },
    include: { category: { include: { group: true } } },
    take: limit,
  });
  return rows.map((p, index) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    priceFcfa: p.priceCents,
    oldPriceFcfa: p.oldPriceCents ?? undefined,
    badge: toBadge(p.badge),
    tone: TONES[index % TONES.length],
    image: p.image,
    href: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
  }));
}
