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

import { numeroSuivant } from "@/lib/kk/numerotation";

export const PREFIXE_FACTURE = "FAC-";

export function numeroFactureSuivant(
  dernierNumero: string | null,
  annee: number
): string {
  return numeroSuivant(PREFIXE_FACTURE, dernierNumero, annee);
}
