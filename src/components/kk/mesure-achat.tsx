"use client";

import { useEffect, useRef } from "react";
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
 */
export function MesureAchat({
  orderNumber,
  articles,
  totalCents,
}: {
  orderNumber: string;
  articles: ArticleMesure[];
  totalCents: number;
}) {
  const envoye = useRef(false);
  useEffect(() => {
    if (envoye.current) return;
    envoye.current = true;
    mesurerEvenement({ type: "purchase", reference: orderNumber, articles, totalCents });
  }, [orderNumber, articles, totalCents]);

  return null;
}
