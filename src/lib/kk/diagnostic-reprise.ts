/**
 * Reprise du Diagnostic Beauté dans l'onglet.
 *
 * Isolé du composant pour une seule raison : c'est ici que se décide si un
 * client connecté se voit proposer de revoir sa routine ou s'il est renvoyé à
 * la question 1, et cette décision se testait jusqu'ici uniquement à la main,
 * dans un navigateur, sur le second affichage de la page.
 */

/** Ce que le parcours écrit dans `sessionStorage` à chaque changement d'état. */
export type Reprise = {
  qIndex?: number;
  answers?: Record<string, string>;
};

/**
 * Le questionnaire est-il RÉELLEMENT entamé ?
 *
 * La présence de la clé ne suffit pas : le parcours enregistre son état dès le
 * premier rendu, donc `{"qIndex":0,"answers":{}}` — une valeur bien présente
 * qui ne décrit aucun progrès. Se fier à `getItem() !== null` faisait dépendre
 * la proposition « revoir ma routine » de l'ordre de déclaration des effets, et
 * ne la laissait vivre que sur le tout premier affichage de la page.
 *
 * Une valeur illisible (stockage corrompu, format d'une version antérieure)
 * vaut « pas entamé » : mieux vaut proposer une fois de trop sa routine à un
 * client qui l'a déjà que de le renvoyer sans raison au questionnaire.
 */
export function questionnaireEntame(brut: string | null | undefined): boolean {
  if (!brut) return false;
  let repris: unknown;
  try {
    repris = JSON.parse(brut);
  } catch {
    return false;
  }
  if (typeof repris !== "object" || repris === null) return false;

  const { qIndex, answers } = repris as Reprise;
  if (typeof qIndex === "number" && qIndex > 0) return true;
  return typeof answers === "object" && answers !== null && Object.keys(answers).length > 0;
}
