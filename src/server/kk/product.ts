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
  // ---- Champs du master (lot 7B), pour la présentation de la fiche (lot 7D).
  // Chacun retombe sur "" quand le master ne l'a pas renseigné — c'est à
  // l'affichage de décider si une section vide se montre ou non, jamais ici.
  /** Tags bruts (préoccupation + type de peau), pour la ligne de préoccupations
   *  et le tableau « en bref » — voir `src/lib/kk/besoins.ts`. */
  tags: string[];
  /** Question d'accroche du problème que le produit résout. */
  problemeAccroche: string;
  /** À qui il s'adresse — texte libre du master, pas une liste. */
  idealPour: string;
  usageMatin: string;
  usageSoir: string;
  /** Fréquence d'usage (« Quotidien », « 2x/semaine »…). */
  frequence: string;
  conseilKossKoss: string;
  /** Actifs clés, texte libre (« Propolis 60 % ; Niacinamide 2 % »). */
  actifsCles: string;
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
  // Champs du master (lot 7D) : même règle de repli que le reste de la fiche —
  // pickText, jamais un accès direct au champ *En.
  const problemeAccroche = pickText(p.problemeAccroche, traduire ? p.problemeAccrocheEn : undefined);
  const idealPour = pickText(p.idealPour, traduire ? p.idealPourEn : undefined);
  const usageMatin = pickText(p.usageMatin, traduire ? p.usageMatinEn : undefined);
  const usageSoir = pickText(p.usageSoir, traduire ? p.usageSoirEn : undefined);
  const frequence = pickText(p.frequence, traduire ? p.frequenceEn : undefined);
  const conseilKossKoss = pickText(p.conseilKossKoss, traduire ? p.conseilKossKossEn : undefined);
  const actifsCles = pickText(p.actifsCles, traduire ? p.actifsClesEn : undefined);

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
    tags: parseStringArray(p.tags),
    problemeAccroche,
    idealPour,
    usageMatin,
    usageSoir,
    frequence,
    conseilKossKoss,
    actifsCles,
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
