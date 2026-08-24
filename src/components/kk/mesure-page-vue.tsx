"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { mesurerAction } from "@/lib/kk/mesureNavigateur";

/**
 * Émet une vue de page GA4 à chaque navigation, y compris les transitions
 * client de l'App Router (qui ne rechargent pas la page). GA4 est configuré
 * avec `send_page_view: false` (voir `mesureNavigateur`) : sans ce composant,
 * seule la première page d'une visite serait comptée — et encore, seulement si
 * une autre mesure partait. L'envoi reste soumis au consentement « mesure » et
 * ne part que si la bibliothèque a été chargée (garde de `mesurerAction`).
 *
 * On lit `window.location.href` plutôt que `useSearchParams()` : cela évite de
 * forcer le rendu dynamique de toutes les pages, tout en donnant à GA4 l'URL
 * complète — avec ses éventuels UTM — pour l'attribution des campagnes.
 */
export function MesurePageVue() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    mesurerAction("page_view", {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
