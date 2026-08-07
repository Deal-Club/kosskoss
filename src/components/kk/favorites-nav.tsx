"use client";

import { LocalizedLink as Link } from "./localized-link";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

/**
 * Accès aux favoris depuis la navigation.
 *
 * Le compteur reste à zéro tant que React n'a pas relu le magasin : le serveur
 * ne connaît pas le navigateur et afficherait sinon un chiffre faux le temps de
 * l'hydratation.
 */

/** Cœur du bandeau d'en-tête, à côté du panier. Masqué sur mobile (barre basse). */
export function FavoritesLink() {
  const { count, ready } = useFavorites();
  const visible = ready ? count : 0;

  return (
    <Link
      href="/favoris"
      aria-label={visible > 0 ? `Favoris, ${visible} article${visible > 1 ? "s" : ""}` : "Favoris"}
      className="relative hidden h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand sm:grid"
    >
      <Heart className="h-5 w-5" />
      {visible > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-deep px-1 text-[0.6rem] font-semibold text-primary-foreground">
          {visible}
        </span>
      )}
    </Link>
  );
}

/** Pastille du compteur, posée sur l'icône « Favoris » de la barre mobile. */
export function FavoritesTabBadge() {
  const { count, ready } = useFavorites();
  if (!ready || count === 0) return null;

  return (
    <span className="absolute -right-2 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-deep px-1 text-[0.6rem] font-semibold text-primary-foreground">
      {count}
    </span>
  );
}
