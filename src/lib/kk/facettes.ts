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
