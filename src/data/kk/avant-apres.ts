/**
 * Cas « avant / après » — bloc 9 de la structure fournie par le client
 * (« preuves de résultats · crédibilité »).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA LISTE EST VIDE, ET C'EST VOLONTAIRE.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le bloc est construit et branché : il s'affichera dès qu'un cas réel sera
 * ajouté ici, et reste entièrement masqué tant qu'il n'y en a aucun — exactement
 * comme la section des avis clients.
 *
 * Nous n'inventons pas ces images. Un avant/après est la preuve la plus forte
 * qu'une boutique de soin puisse produire, et donc la plus destructrice quand
 * elle est fabriquée : l'identité de marque pose « promesses réalistes, pas de
 * discours miracle ni trompeur », et la cible est décrite comme « méfiante ».
 * Une photo de banque d'images retournerait le bloc contre la boutique.
 *
 * CE QU'IL FAUT POUR ACTIVER LE BLOC :
 *   — un couple de photos réel, même cadrage, même lumière, même distance ;
 *   — le consentement écrit de la personne photographiée ;
 *   — la durée réelle entre les deux prises, annoncée telle quelle ;
 *   — la routine effectivement suivie, pour pouvoir y renvoyer.
 *
 * Les deux photos peuvent être livrées en une seule image accolée (avant à
 * gauche, après à droite) : c'est ce que le gabarit attend.
 */

export interface AvantApresView {
  /** Chemin public de l'image accolée (avant à gauche, après à droite). */
  image: string;
  /** Description pour les lecteurs d'écran — ce qu'on voit, pas la promesse. */
  alt: string;
  /** Ce qui a été suivi. Ex. « Routine anti-taches Nubiance ». */
  title: string;
  /** La durée réelle. Ex. « Résultats visibles en 8 semaines ». */
  caption: string;
  /** Lien vers la routine suivie, si elle est publiée. */
  routineHref?: string;
}

export const AVANT_APRES: AvantApresView[] = [];
