"use client";

import { useEffect } from "react";
import { mesurerEvenement } from "@/lib/kk/mesureNavigateur";
import type { ArticleMesure } from "@/lib/kk/mesure";

/**
 * `purchase` : monté UNIQUEMENT quand `order.paymentStatus === "payee"` (voir
 * la page de confirmation) — jamais sur un simple retour de navigateur, pour
 * la même raison que `paiement.ts` ne fait jamais confiance à ce retour côté
 * serveur : seul le webhook signé fait foi, et c'est lui qui a déjà fait
 * passer la commande en « payée » avant que cette page ne se rende.
 *
 * `reference` est le numéro de commande : `identifiantEvenement("purchase",
 * reference)`, calculé à l'identique ici et dans `src/server/kk/capi.ts`
 * (CAPI), est ce qui permet à Meta de dédupliquer les deux envois du même
 * achat — voir `@/lib/kk/mesure`.
 *
 * ── LA GARDE DOIT SURVIVRE AU RECHARGEMENT, PAS SEULEMENT AU DOUBLE MONTAGE ──
 *
 * Un `useRef` empêche un second envoi au double montage du Strict Mode, mais
 * disparaît avec le composant : un rechargement de cette page, un retour
 * arrière suivi d'un « avancer », ou une réouverture du lien de confirmation
 * dans les deux heures du cookie d'accès — tous replacent ce composant à
 * l'état initial et renvoient un second `purchase`. Meta déduplique par
 * `event_id` (voir l'en-tête de `capi.ts`) — mais **GA4 ne déduplique jamais**
 * deux événements `purchase` distincts : sans une garde qui survive au
 * rechargement, le chiffre d'affaires GA4 se retrouve gonflé d'autant de
 * revisites que le client en fait sur cette page.
 *
 * `localStorage`, borné au NUMÉRO DE COMMANDE (une clé par commande, jamais un
 * drapeau global) : un rechargement de la page de confirmation ne renvoie
 * plus l'événement, mais la confirmation d'une AUTRE commande, elle, en envoie
 * bien un — c'est toujours un achat distinct.
 */

export const PREFIXE_STOCKAGE = "mlc.achat-mesure.v1.";

/** Cet achat a-t-il déjà été mesuré, dans CE navigateur ? Exporté pour les tests. */
export function dejaMesure(orderNumber: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREFIXE_STOCKAGE + orderNumber) === "1";
  } catch {
    // Stockage indisponible (navigation privée stricte, quota dépassé…) : on
    // se rabat sur le comportement du seul montage courant, jamais sur une
    // erreur visible du visiteur.
    return false;
  }
}

/** Marque cet achat comme mesuré, pour que le prochain rendu ne le renvoie pas. Exporté pour les tests. */
export function marquerMesure(orderNumber: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIXE_STOCKAGE + orderNumber, "1");
  } catch {
    // Idem : un stockage indisponible ne doit jamais faire tomber la page, au
    // pire coût d'une mesure potentiellement dupliquée ce jour-là.
  }
}

export function MesureAchat({
  orderNumber,
  articles,
  totalCents,
}: {
  orderNumber: string;
  articles: ArticleMesure[];
  totalCents: number;
}) {
  useEffect(() => {
    if (dejaMesure(orderNumber)) return;
    marquerMesure(orderNumber);
    mesurerEvenement({ type: "purchase", reference: orderNumber, articles, totalCents });
  }, [orderNumber, articles, totalCents]);

  return null;
}
