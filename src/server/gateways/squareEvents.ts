/**
 * Lecture des événements de webhook Square — partie pure, sans appel réseau ni
 * base de données, pour être testable telle quelle.
 *
 * Le SDK Square ne désérialise pas les webhooks : le corps arrive en JSON brut,
 * champs en snake_case. On ne fait confiance à rien de ce qu'il contient (la
 * signature est vérifiée en amont, mais la forme du message, elle, peut changer
 * d'une version d'API à l'autre).
 */

import type { PaymentStatus } from "@/lib/orderStatus";

/** Paiement tel qu'il apparaît dans un événement Square. */
export interface SquareEventPayment {
  id?: string;
  order_id?: string;
  status?: string;
  reference_id?: string;
  /**
   * Montant encaissé. Square l'exprime en plus petite unité monétaire — donc en
   * centimes pour l'euro — et le sérialise en nombre dans le JSON du webhook,
   * là où le SDK manipule un BigInt. La route de webhook s'en sert pour vérifier
   * que la somme reçue correspond bien au total de la commande.
   */
  amount_money?: { amount?: number; currency?: string };
}

export interface SquareEventBody {
  type?: string;
  data?: { object?: { payment?: SquareEventPayment } };
}

/** Types d'événements dont la boutique tire une conclusion. */
const HANDLED_TYPES = new Set(["payment.created", "payment.updated"]);

/**
 * Traduit un statut de paiement Square en statut de commande de la boutique.
 *
 * Les états transitoires (`PENDING`, `APPROVED` — carte autorisée mais non
 * capturée) rendent null : la commande reste « offen » jusqu'à l'encaissement
 * réel, sans quoi une autorisation jamais capturée passerait pour un paiement.
 */
export function squarePaymentStatus(status: string | undefined): PaymentStatus | null {
  switch (status) {
    case "COMPLETED":
      return "bezahlt";
    case "FAILED":
    case "CANCELED":
      return "fehlgeschlagen";
    default:
      return null;
  }
}

/**
 * Extrait de l'événement ce qui est exploitable : le paiement et le statut à
 * appliquer. Rend null dès que l'événement ne concerne pas l'état de paiement —
 * la route webhook accuse alors réception sans rien changer.
 */
export function readSquareEvent(
  body: string,
): { payment: SquareEventPayment; paymentStatus: PaymentStatus } | null {
  let event: SquareEventBody;
  try {
    event = JSON.parse(body) as SquareEventBody;
  } catch {
    return null;
  }

  if (!event.type || !HANDLED_TYPES.has(event.type)) return null;

  const payment = event.data?.object?.payment;
  if (!payment) return null;

  const paymentStatus = squarePaymentStatus(payment.status);
  if (!paymentStatus) return null;

  return { payment, paymentStatus };
}
