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

/**
 * Cœur du bandeau d'en-tête, à côté du panier.
 *
 * Il était masqué sous 640 px — donc sur TOUS les téléphones — parce que la
 * barre d'onglets basse portait l'entrée « Favoris ». Cette barre a été
 * retirée : le cœur revient dans l'en-tête, avec son compteur, qui est le seul
 * rappel visible d'une envie mise de côté.
 *
 * Il ne s'efface qu'en dessous de 360 px, où burger, logotype, recherche,
 * favoris et panier ne tiennent plus sur une rangée. Les favoris restent alors
 * accessibles depuis le menu, qui porte « Mes favoris ».
 */
export function FavoritesLink() {
  const { count, ready } = useFavorites();
  const visible = ready ? count : 0;

  return (
    <Link
      href="/favoris"
      aria-label={visible > 0 ? `Favoris, ${visible} article${visible > 1 ? "s" : ""}` : "Favoris"}
      className="relative grid h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand max-[359px]:hidden"
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

/* `FavoritesTabBadge` a disparu avec la barre d'onglets basse qu'elle
   décorait. Le compteur vit désormais uniquement sur `FavoritesLink`. */
