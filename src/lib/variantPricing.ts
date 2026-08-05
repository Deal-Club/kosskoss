// src/lib/variantPricing.ts

/** Vue d'une variation exposée à la boutique et au panier. */
export interface VariantView {
  id: string;
  label: string;
  priceCents: number;
  oldPriceCents?: number;
}

/** Variation transmise au serveur pour enregistrement (create/update). */
export interface VariantInput {
  id?: string;
  label: string;
  labelEn?: string;
  priceCents: number;
  oldPriceCents?: number;
  position?: number;
  active?: boolean;
}

/**
 * Prix « à partir de » : plus petit prix parmi les variations actives.
 * `undefined` si aucune variation active — l'appelant garde alors le prix
 * simple du produit.
 */
export function minActivePriceCents(
  variants: { priceCents: number; active?: boolean }[],
): number | undefined {
  const actifs = variants.filter((v) => v.active !== false).map((v) => v.priceCents);
  return actifs.length > 0 ? Math.min(...actifs) : undefined;
}

/**
 * Clé d'identité d'une ligne de panier. Deux volumes d'un même produit doivent
 * faire deux lignes ; un produit sans variation garde son seul identifiant.
 */
export function cartLineKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

/**
 * Prix effectif d'une variation après application d'une promotion de campagne.
 *
 * Source unique de vérité pour le calcul « ratio proportionnel » appliqué aussi
 * bien à l'affichage (store.ts → toViewProduct) qu'à la facturation (orders.ts)
 * et à la revalidation du panier (/api/cart). Les trois chemins doivent produire
 * exactement le même montant : display == charge.
 *
 * Règle : si la promotion fait baisser le prix du produit de référence, on
 * applique le même ratio au prix de base de la variation, plafonné à ce prix de
 * base (jamais de prix négatif ni supérieur au tarif catalogue).
 *
 * @param variantBaseCents  Prix catalogue de la variation, lu en base.
 * @param promotion         Promotion active, ou undefined si aucune.
 */
export function discountedVariantCents(
  variantBaseCents: number,
  promotion: { priceCents: number; basePriceCents: number; savingCents?: number } | undefined,
): number {
  if (!promotion || promotion.basePriceCents <= 0) return variantBaseCents;
  const lowers =
    promotion.savingCents !== undefined
      ? promotion.savingCents > 0
      : promotion.priceCents < promotion.basePriceCents;
  if (!lowers) return variantBaseCents;
  return Math.min(
    variantBaseCents,
    Math.round((variantBaseCents * promotion.priceCents) / promotion.basePriceCents),
  );
}
