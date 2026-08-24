"use client";

import type { ReactNode } from "react";
import { mesurerAction } from "@/lib/kk/mesureNavigateur";

/**
 * Lien WhatsApp qui mesure le clic comme une conversion.
 *
 * La livraison de la boutique se coordonne par WhatsApp : ce clic est donc une
 * étape de conversion réelle, pas un simple lien sortant. On émet
 * `contact_whatsapp` vers GA4 (catégorie « mesure ») et l'événement standard
 * « Contact » vers Meta (catégorie « marketing ») — chacun sous son propre
 * consentement, via `mesurerAction`. `location` distingue l'origine du clic
 * (bouton flottant, page de confirmation, fiche produit…) pour l'analyse.
 *
 * Rendu identique à un `<a target="_blank" rel="noopener noreferrer">` : les
 * composants serveur qui l'emploient lui passent `href`, `className` et leur
 * contenu, la mesure vit ici, côté client.
 */
export function LienWhatsApp({
  href,
  location,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  location: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={() => mesurerAction("contact_whatsapp", { location }, { evenement: "Contact" })}
    >
      {children}
    </a>
  );
}
