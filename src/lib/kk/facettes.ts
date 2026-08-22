/**
 * Correspondance d'un produit à une sélection de facettes.
 *
 * UNION et non intersection : cocher « peau grasse » puis « peau mixte » élargit
 * la sélection au lieu de la vider. C'est le comportement déjà en place pour la
 * marque, et celui qu'un visiteur attend d'une liste de cases.
 */
export function produitCorrespond(tagsProduit: string[], selection: string[]): boolean {
  if (selection.length === 0) return true;
  return selection.some((cle) => tagsProduit.includes(cle));
}

export interface OptionFacette {
  key: string;
  label: string;
  family: string;
}

/** Les deux seules familles proposées en facettes de catalogue. */
export const FAMILLE_PEAU = "peau";
export const FAMILLE_PREOCCUPATION = "preoccupation";

/** Sélection de facettes, une liste de clés cochées par famille. */
export type FacetteSelection = {
  peau: string[];
  preoccupation: string[];
};

/**
 * Correspondance d'un produit à une sélection de facettes réparties en familles.
 *
 * RÈGLE — non devinable, à ne jamais inverser : UNION dans une famille,
 * INTERSECTION entre familles.
 *   - Cocher « peau grasse » et « peau mixte » (même famille « peau ») élargit :
 *     un produit qui porte l'un OU l'autre tag est retenu — c'est `produitCorrespond`,
 *     appliqué à la famille.
 *   - Cocher un type de peau ET une préoccupation (deux familles différentes)
 *     restreint : le produit doit satisfaire LES DEUX familles cochées à la fois.
 * Inverser cette règle (tout mettre en union, ou tout en intersection) viderait
 * le catalogue au deuxième clic sur une famille différente — l'exact contraire
 * de ce qu'une liste de cases à cocher doit produire. Une famille non cochée
 * (liste vide) ne contraint rien, comme le fait déjà `produitCorrespond` seul.
 */
export function produitCorrespondFacettes(
  tagsProduit: string[],
  selection: FacetteSelection,
): boolean {
  return (
    produitCorrespond(tagsProduit, selection.peau) &&
    produitCorrespond(tagsProduit, selection.preoccupation)
  );
}
