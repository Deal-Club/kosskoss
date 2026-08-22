import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toBadge, toProductView } from "./product-view";
import { pickText, pickList, needsTranslation } from "@/server/localizedContent";
import type { KKProductView, KKBadge } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

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
  locale: Locale,
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

  // Le repli passe uniquement par pickText/pickList — jamais un accès direct
  // à un champ *En. La marque, nom propre, ne se traduit jamais.
  const traduire = needsTranslation(locale);
  const name = pickText(p.name, traduire ? p.nameEn : undefined);
  const shortDescription = pickText(p.shortDescription ?? "", traduire ? p.shortDescriptionEn : undefined);
  const description = pickText(p.description ?? "", traduire ? p.descriptionEn : undefined);
  const bullets = pickList(parseStringArray(p.bullets), traduire ? parseStringArray(p.bulletsEn) : undefined);

  return {
    id: p.id,
    brand: p.brand,
    name,
    slug: p.slug,
    sku: p.sku,
    shortDescription,
    description,
    bullets,
    priceFcfa: p.priceCents,
    oldPriceFcfa: p.oldPriceCents ?? undefined,
    badge: toBadge(p.badge),
    stock: p.stock,
    image: p.image,
    images: parseStringArray(p.images),
    // Fil d'Ariane de la fiche : mêmes libellés que le catalogue, même repli.
    group: {
      slug: p.category.group.slug,
      label: pickText(p.category.group.label, traduire ? p.category.group.labelEn : undefined),
    },
    category: {
      slug: p.category.slug,
      label: pickText(p.category.label, traduire ? p.category.labelEn : undefined),
    },
    variants: p.variants.map((v) => ({
      id: v.id,
      label: pickText(v.label, traduire ? v.labelEn : undefined),
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
  locale: Locale,
  limit = 4,
): Promise<KKProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, category: { slug: categorySlug }, id: { not: excludeId } },
    include: PRODUCT_VIEW_INCLUDE,
    take: limit,
  });
  return rows.map((row, index) => toProductView(row, locale, index));
}
