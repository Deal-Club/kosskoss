import { pickText } from "@/server/localizedContent";

/**
 * Sélection des gestes du Diagnostic Beauté.
 *
 * Isolé du stockage parce que les tests du projet n'ont pas d'accès base, et
 * que c'est ici qu'une erreur se verrait : un geste disparu de la routine, ou
 * une clé brute affichée au visiteur. `pickText` (import pur, sans accès
 * base tant qu'on ne l'appelle pas) reste la seule règle de repli du projet.
 */

export type GesteLigne = {
  key: string;
  labelFr: string;
  labelEn: string;
  category: string;
  position: number;
  active: boolean;
};

/**
 * Gestes retenus pour une routine, dans l'ordre.
 *
 * Copie avant de trier : l'appelant garde sa liste complète pour l'écran
 * d'administration, et un tri en place la lui casserait.
 */
export function gestesActifs(lignes: GesteLigne[]): GesteLigne[] {
  return [...lignes].filter((g) => g.active).sort((a, b) => a.position - b.position);
}

/**
 * Libellé dans la langue de la page.
 *
 * Repli sur le français si la traduction anglaise n'a pas été saisie : mieux
 * vaut un libellé dans l'autre langue qu'une clé technique à l'écran.
 */
export function libelleGeste(geste: GesteLigne, locale: string): string {
  return pickText(geste.labelFr, locale === "en" ? geste.labelEn : undefined);
}
