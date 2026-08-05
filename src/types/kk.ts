/**
 * Types partagés du front KossKoss Select.
 */

export type KKBadge = "bestseller" | "nouveau" | null;

/** `tone` pilote le dégradé du visuel produit quand il n'y a pas de photo. */
export type KKTone = "sand" | "rose" | "teal" | "clay";

/** Vue produit prête à afficher (carte, rail). Montants en FCFA entiers. */
export type KKProductView = {
  id: string;
  brand: string;
  name: string;
  priceFcfa: number;
  oldPriceFcfa?: number;
  badge: KKBadge;
  tone: KKTone;
  /** Photo produit (Cloudinary) ; vide/absent = motif de secours. */
  image?: string | null;
  /** Lien vers la fiche produit ; absent en mode démo. */
  href?: string;
};
