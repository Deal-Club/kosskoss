/**
 * Lecture des notifications Nexi — partie pure, sans appel réseau ni base.
 *
 * Isolée pour être testable : c'est la logique la plus incertaine du lot, faute
 * d'avoir pu être confrontée à un vrai compte Nexi. Les tests figent le
 * comportement attendu, de sorte qu'une correction faite après un vrai paiement
 * de test soit un changement délibéré et visible.
 */

import type { PaymentStatus } from "@/lib/orderStatus";

/** Corps d'une notification Nexi, réduit à ce qu'on en exploite. */
export interface NexiNotification {
  securityToken?: string;
  operation?: {
    orderId?: string;
    operationId?: string;
    operationType?: string;
    operationResult?: string;
    /**
     * Montant de l'opération, en plus petite unité monétaire et sérialisé en
     * chaîne (« 21450 » pour 214,50 €). Nexi ne le documente pas comme
     * obligatoire sur toutes les notifications : il reste facultatif ici, et le
     * contrôle de montant est sauté quand il manque.
     */
    operationAmount?: string;
    operationCurrency?: string;
  };
}

/** Résultats qui valent un échec franc du paiement. */
const FAILED_RESULTS = new Set(["DECLINED", "DENIED_BY_RISK", "FAILED", "CANCELED", "VOID"]);

/**
 * Traduit un résultat d'opération Nexi en statut de commande.
 *
 * Volontairement prudent : seule une opération réellement exécutée vaut
 * paiement, et une autorisation ne compte que si elle porte sur une capture.
 * Tout le reste laisse la commande en attente — mieux vaut une commande payée
 * qui reste à confirmer à la main qu'une commande impayée marquée « payée ».
 */
export function nexiPaymentStatus(
  result: string | undefined,
  operationType: string | undefined,
): PaymentStatus | null {
  if (result === "EXECUTED") return "bezahlt";
  if (result === "AUTHORIZED" && operationType === "CAPTURE") return "bezahlt";
  if (result && FAILED_RESULTS.has(result)) return "fehlgeschlagen";
  return null;
}

/**
 * Relit une notification. Rend null si le corps est illisible ou s'il manque de
 * quoi l'authentifier — sans numéro de commande ni jeton, il n'y a rien à
 * vérifier et donc rien à appliquer.
 */
export function readNexiNotification(
  body: string,
): { orderNumber: string; securityToken: string; notification: NexiNotification } | null {
  let notification: NexiNotification;
  try {
    notification = JSON.parse(body) as NexiNotification;
  } catch {
    return null;
  }

  const orderNumber = notification.operation?.orderId;
  const securityToken = notification.securityToken;
  if (!orderNumber || !securityToken) return null;

  return { orderNumber, securityToken, notification };
}
