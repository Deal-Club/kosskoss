/**
 * Séquence annuelle de numéros de documents.
 *
 * Une seule règle pour les factures et les bons de commande : même remise à un
 * en janvier, même refus de poursuivre le compteur d'une autre année, même
 * repli sur 1 quand le dernier numéro est illisible.
 *
 * Deux copies d'une règle de numérotation divergent, et un numéro qui se répète
 * est un incident comptable — pas un défaut d'affichage.
 */

/** Six chiffres : de quoi tenir un million de documents par an. */
const LARGEUR = 6;

export function numeroSuivant(
  prefixe: string,
  dernierNumero: string | null,
  annee: number,
): string {
  const debut = `${prefixe}${annee}-`;

  // Un dernier numéro d'une autre année, ou d'un autre préfixe, ne poursuit
  // pas le compteur.
  const compteur =
    dernierNumero && dernierNumero.startsWith(debut)
      ? Number.parseInt(dernierNumero.slice(debut.length), 10)
      : 0;

  const suivant = Number.isFinite(compteur) ? compteur + 1 : 1;
  return `${debut}${String(suivant).padStart(LARGEUR, "0")}`;
}
