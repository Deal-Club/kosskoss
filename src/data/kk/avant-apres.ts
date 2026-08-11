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

/* ------------------------------------------------- Comparateur à curseur -- */

/**
 * Visuel du comparateur de la section « Notre raison d'être ».
 *
 * ⚠️ CE N'EST PAS UN AVANT/APRÈS DE RÉSULTATS. La section illustre la démarche
 * de la maison — d'un côté ce que vivent les clientes, de l'autre ce que la
 * boutique y répond. Le bloc de preuve par les résultats, lui, reste
 * `AVANT_APRES` plus haut, et lui exige un cas réel avec durée et consentement.
 *
 * La différence décide de ce qu'on a le droit d'afficher : une illustration de
 * démarche n'engage que sur la méthode, à condition de ne jamais laisser croire
 * à un résultat obtenu. D'où deux règles pour ces images :
 *
 *   — `mention` doit porter le mot « illustration », visible sous l'image ;
 *   — aucune durée, aucun pourcentage, aucun nom de produit associé.
 *
 * Contrainte technique, elle aussi impérative : les deux photos doivent être
 * SUPERPOSABLES. Même cadrage, même distance, même axe, même lumière. Le
 * curseur révèle une image sous l'autre — si le visage bouge d'une prise à
 * l'autre, le glissement montre un décalage au lieu d'une transformation.
 * D'où la méthode : générer la seconde image en ÉDITION de la première, et
 * non par une seconde génération indépendante.
 */
export interface AvantApresCase {
  /** Chemin public de la photo initiale. */
  avant: string;
  /** Chemin public de la photo finale, même cadrage. */
  apres: string;
  altAvant: string;
  altApres: string;
  /**
   * Mention affichée sous l'image. Doit dire qu'il s'agit d'une illustration —
   * c'est elle qui empêche la section d'être lue comme une promesse de résultat.
   */
  mention: string;
}

/**
 * `null` tant qu'aucun cas réel n'est disponible : la section affiche alors sa
 * colonne de texte et laisse un aplat à la place du comparateur, plutôt qu'une
 * photo d'illustration qui se lirait comme un résultat.
 */
export const AVANT_APRES_CAS: AvantApresCase | null = {
  avant: "/images/editorial/demarche-avant-v2.webp",
  apres: "/images/editorial/demarche-apres-v2.webp",
  altAvant:
    "Portrait d'une femme à la peau riche en mélanine, marques d'hyperpigmentation visibles sur les joues",
  altApres: "Le même portrait, teint unifié, grain de peau conservé",
  // La mention dit ce que la section est, et ce qu'elle n'est pas. Sans elle,
  // deux visages côte à côte se lisent comme un résultat obtenu.
  mention:
    "Illustration de notre démarche — ce n'est pas un résultat client. Chaque peau évolue à son rythme.",
};
