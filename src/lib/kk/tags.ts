/**
 * Lecture des tags d'un produit.
 *
 * `Product.tags` stocke un tableau JSON de clés. Cette fonction existait en
 * double, à l'identique, dans server/kk/diagnostic.ts et
 * server/kk/product-tags.ts ; les facettes de catalogue en auraient fait une
 * troisième copie.
 *
 * Ne lève jamais : un champ corrompu rend un tableau vide plutôt que de faire
 * tomber une page catalogue.
 */
export function parseTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const lu: unknown = JSON.parse(value);
    return Array.isArray(lu) ? lu.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
