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

/* Le comparateur à curseur qui vivait ici a été retiré.

   Il illustrait la section « Notre raison d'être » par un visage coupé en
   deux — « LE PROBLÈME » / « NOTRE RÉPONSE ». Le client l'a refusé : « je ne
   trouve pas de sens à ces images comparatives, je ne sais pas ce que cela
   résout exactement et avec quoi ».

   Le défaut était structurel. Le texte de la section parle de la difficulté de
   CHOISIR ; l'image montrait une PEAU qui change. Elle promettait donc un
   résultat cutané là où la section promet un parcours d'achat simplifié — au
   point qu'il avait fallu écrire sous elle « ce n'est pas un résultat client »
   pour l'empêcher de mentir. Quand une légende doit désamorcer ce que l'image
   raconte, c'est l'image qu'il faut changer.

   La section montre désormais trois obstacles, trois réponses chiffrées et
   l'anatomie d'une routine réelle : voir src/components/kk/raison-detre.tsx.

   Le bloc de preuve par les RÉSULTATS, lui, reste `AVANT_APRES` ci-dessus, et
   ses exigences n'ont pas bougé — cas réel, durée, consentement. */
