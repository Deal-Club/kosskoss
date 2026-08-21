/**
 * Réponses du Diagnostic Beauté, telles que stockées sur le profil client.
 *
 * On garde les RÉPONSES et non la routine calculée : un type de peau ne périme
 * pas, un catalogue si. Le client qui revient dans six mois voit donc une
 * routine recalculée sur les produits réellement disponibles, plutôt qu'une
 * liste figée pleine de ruptures de stock.
 *
 * Ne lève jamais : une colonne corrompue rend un tableau vide plutôt que de
 * faire tomber la page du diagnostic.
 */

export function ecrireReponses(ids: string[]): string {
  return JSON.stringify(ids);
}

export function lireReponses(json: string | null): string[] {
  if (!json) return [];
  try {
    const lu: unknown = JSON.parse(json);
    return Array.isArray(lu) ? lu.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
