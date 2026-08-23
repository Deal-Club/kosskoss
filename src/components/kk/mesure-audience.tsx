"use client";

import { useEffect } from "react";
import { initialiserMesure } from "@/lib/kk/mesureNavigateur";

/**
 * Monté une fois dans `src/app/[locale]/layout.tsx`, avec les identifiants
 * GA4 et Pixel lus en base par le layout (composant serveur). Ne rend rien :
 * tout son travail — poser `gtag.js`/`fbevents.js` si l'identifiant est
 * configuré ET le consentement donné — vit dans `@/lib/kk/mesureNavigateur`,
 * où les deux conditions et le relevé de consentement à chaque événement sont
 * expliqués en détail.
 *
 * Les identifiants transitent en props plutôt que d'être relus ici par une
 * requête : `getParametres()` est déjà mémoïsé par le layout (voir le pied de
 * page et le bouton WhatsApp, qui le lisent de la même façon), et ce composant
 * n'a donc rien à demander de plus au serveur.
 */
export function MesureAudience({ ga4Id, metaPixelId }: { ga4Id: string; metaPixelId: string }) {
  useEffect(() => {
    initialiserMesure({ ga4Id, metaPixelId });
  }, [ga4Id, metaPixelId]);

  return null;
}
