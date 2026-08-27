import type { KKBadge, KKProductView, KKTone } from "@/types/kk";
import { normaliserBadge } from "@/lib/kk/badges";
import { packshot } from "@/lib/kk/packshot";
import { pickText, pickList, needsTranslation } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";

/**
 * Construction de la vue produit affichée sur les vignettes (accueil, catalogue,
 * produits associés, diagnostic).
 *
 * Un seul endroit pour quatre appelants : la vignette porte désormais un bouton
 * d'ajout au panier, et une carte qui oublierait `slug`, `stock` ou
 * `hasVariants` produirait une ligne de panier que le serveur refuserait à la
 * commande. Mieux vaut une fonction commune qu'un quatrième `rows.map` recopié.
 */

const TONES: KKTone[] = ["clay", "sand", "teal", "rose"];

/**
 * Les champs `bullets`/`images`/`tags` sont des String JSON (défaut "[]").
 * Partagé par `product.ts` (fiche produit) et `routines.ts` (ligne de
 * préoccupations agrégée sur les produits d'une routine, lot 7D) : un seul
 * endroit qui décide qu'une valeur illisible vaut liste vide plutôt que de
 * faire tomber la page.
 */
export function parseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const v: unknown = JSON.parse(value);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Teinte du dégradé de secours, en rotation sur la position dans la grille. */
export function toneAt(index: number): KKTone {
  return TONES[index % TONES.length];
}

/**
 * Badge affichable à partir de ce qui est stocké.
 *
 * La reconnaissance vit dans `lib/kk/badges` — clés, libellés et saisies
 * acceptées y sont réunis. Cette fonction n'est plus qu'un point d'entrée,
 * conservé parce que six appelants l'utilisent déjà.
 */
export function toBadge(value: string | null): KKBadge {
  return normaliserBadge(value);
}

/**
 * Sélection Prisma minimale pour bâtir une vue produit.
 * `variants` n'est lu que pour savoir s'il en existe au moins une active : la
 * vignette n'affiche pas les contenances, elle renvoie vers la fiche.
 */
export const PRODUCT_VIEW_INCLUDE = {
  category: { include: { group: true } },
  variants: { where: { active: true }, select: { id: true } },
} as const;

/** Ligne de base attendue : le minimum qu'une requête doit avoir sélectionné. */
export interface ProductViewRow {
  id: string;
  slug: string;
  brand: string;
  name: string;
  /** Traduction anglaise du nom ; vide = repli sur le français (voir `pickText`). */
  nameEn?: string;
  priceCents: number;
  oldPriceCents: number | null;
  badge: string | null;
  image: string | null;
  stock: number;
  /** Résumé affiché au survol de la vignette. Colonne déjà chargée par
   *  `include` : aucun élargissement de requête. */
  shortDescription?: string;
  /** Traduction anglaise du résumé ; même repli que `nameEn`. */
  shortDescriptionEn?: string;
  category: { slug: string; group: { slug: string } };
  /** Absent si la requête n'a pas inclus les variations : on suppose alors aucune. */
  variants?: { id: string }[];
  /** JSON de chaînes (défaut "[]") — voir `parseStringArray`. */
  bullets?: string;
  bulletsEn?: string;
}

/**
 * Construit la vue produit dans la langue de la page qui l'affiche.
 *
 * `locale` est obligatoire — sans valeur par défaut — pour qu'un appelant qui
 * l'oublie échoue à la compilation plutôt qu'en silence sur la boutique
 * anglaise. Le repli passe uniquement par `pickText` (jamais un accès direct
 * à `nameEn`/`shortDescriptionEn`) et la marque n'est jamais traduite : voir
 * `localizeProduct` dans `src/server/localizedContent.ts`, qui applique la
 * même règle sur l'autre pipeline du catalogue.
 */
export function toProductView(row: ProductViewRow, locale: Locale, index = 0): KKProductView {
  const traduire = needsTranslation(locale);
  const name = pickText(row.name, traduire ? row.nameEn : undefined);
  const shortDescription = pickText(row.shortDescription ?? "", traduire ? row.shortDescriptionEn : undefined);
  const bullets = pickList(
    parseStringArray(row.bullets ?? null),
    traduire ? parseStringArray(row.bulletsEn ?? null) : undefined,
  );

  return {
    id: row.id,
    slug: row.slug,
    // La marque est un nom propre : elle ne se traduit jamais.
    brand: row.brand,
    name,
    shortDescription: shortDescription.trim() || undefined,
    priceFcfa: row.priceCents,
    oldPriceFcfa: row.oldPriceCents ?? undefined,
    badge: toBadge(row.badge),
    tone: toneAt(index),
    // Version détourée quand elle existe, visuel d'origine sinon. Fait ici plutôt
    // que dans chaque composant : la vue produit alimente les vignettes, le
    // catalogue, le panier, les routines et le diagnostic — une seule des cinq
    // qui oublierait la conversion réafficherait un fond de studio sur une
    // couleur de marque.
    image: packshot(row.image),
    href: `/${row.category.group.slug}/${row.category.slug}/${row.slug}`,
    stock: row.stock,
    hasVariants: (row.variants?.length ?? 0) > 0,
    bullets: bullets.length > 0 ? bullets : undefined,
  };
}
