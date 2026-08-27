"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Bouton « retour » de l'en-tête de paiement.
 *
 * Il pointait vers l'accueil : un visiteur venu du panier ou d'un achat direct
 * depuis une fiche produit se retrouvait éjecté du tunnel à la racine du site
 * au lieu de revenir simplement à la page précédente — retour client explicite
 * là-dessus.
 *
 * Le choix entre « revenir en arrière » et « aller au panier » se prend AU
 * CLIC, pas au rendu : lire `window.history` pendant le rendu produirait un
 * texte différent entre le serveur (qui ne le connaît pas) et le client, donc
 * une erreur d'hydratation. `history.length > 1` sert de repli : arrivée
 * directe sur /commande (lien partagé, URL tapée à la main), il n'y a rien à
 * quoi revenir, et `router.back()` ne ferait rien.
 */
export function CheckoutBackLink({
  label,
  fallbackHref,
  className,
}: {
  label: ReactNode;
  fallbackHref: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={className}
    >
      {label}
    </button>
  );
}
