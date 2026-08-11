import type { KKBadge, KKProductView, KKTone } from "@/types/kk";
import { packshot } from "@/lib/kk/packshot";

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

/** Teinte du dégradé de secours, en rotation sur la position dans la grille. */
export function toneAt(index: number): KKTone {
  return TONES[index % TONES.length];
}

export function toBadge(value: string | null): KKBadge {
  return value === "bestseller" || value === "nouveau" ? value : null;
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
  priceCents: number;
  oldPriceCents: number | null;
  badge: string | null;
  image: string | null;
  stock: number;
  category: { slug: string; group: { slug: string } };
  /** Absent si la requête n'a pas inclus les variations : on suppose alors aucune. */
  variants?: { id: string }[];
}

export function toProductView(row: ProductViewRow, index = 0): KKProductView {
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
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
  };
}
