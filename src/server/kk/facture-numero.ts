/**
 * Numérotation des factures.
 *
 * Séquence annuelle et continue : « FAC-2026-000001 ». Le calcul est isolé ici,
 * sans accès base, parce que c'est la seule partie dont une erreur se verrait
 * chez le comptable — et la seule que les tests du projet savent couvrir.
 *
 * Le préfixe diffère volontairement de celui des commandes (« KOSS- », posé par
 * createKossOrder dans server/kk/checkout.ts) : un numéro de facture et un
 * numéro de commande ne doivent jamais se confondre dans un échange avec le
 * service client. Le « KK- » de server/orders.ts appartient à l'ancien tunnel,
 * qu'aucune page ne rend plus.
 */

export const PREFIXE_FACTURE = "FAC-";

/** Six chiffres : de quoi tenir un million de factures par an. */
const LARGEUR = 6;

export function numeroFactureSuivant(
  dernierNumero: string | null,
  annee: number
): string {
  const prefixe = `${PREFIXE_FACTURE}${annee}-`;

  // Un dernier numéro d'une autre année ne poursuit pas le compteur : la
  // séquence est annuelle.
  const compteur =
    dernierNumero && dernierNumero.startsWith(prefixe)
      ? Number.parseInt(dernierNumero.slice(prefixe.length), 10)
      : 0;

  // Une ligne corrompue rendrait NaN : on repart à 1 plutôt que d'écrire
  // « FAC-2026-NaN » en base.
  const suivant = Number.isFinite(compteur) ? compteur + 1 : 1;

  return `${prefixe}${String(suivant).padStart(LARGEUR, "0")}`;
}
