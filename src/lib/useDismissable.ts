"use client";

import { useEffect } from "react";

/**
 * Comportement commun aux panneaux modaux du site (tiroir du panier, filtres
 * mobiles) : Échap referme le panneau, et le reste de la page ne défile plus
 * tant qu'il est ouvert — sans ça, faire glisser le panneau sur mobile ferait
 * aussi défiler la page en dessous.
 */
export function useDismissable(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);
}
