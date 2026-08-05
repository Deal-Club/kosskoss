/**
 * URL publique du point de notification d'un prestataire.
 *
 * Toutes les routes de webhook vivent sous /api/payments/webhook/<prestataire>.
 * Cette URL est à déclarer telle quelle chez le prestataire ; certains (Square)
 * la font même entrer dans le calcul de la signature, donc la moindre
 * différence — barre oblique finale, `www.` en trop — rejette toutes les
 * notifications. Les tests de connexion l'affichent pour qu'elle soit recopiée
 * plutôt que retapée.
 */

import type { GatewayId } from "./types";

export function gatewayWebhookUrl(provider: GatewayId): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${base}/api/payments/webhook/${provider}`;
}

/**
 * Vrai si l'URL est joignable depuis l'extérieur. Un `localhost` ou une adresse
 * privée ne recevra jamais de notification : le paiement aboutira chez le
 * prestataire sans que la commande ne passe en « payée ».
 */
export function isPubliclyReachable(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;
    if (hostname === "localhost" || hostname.endsWith(".local")) return false;
    if (/^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
