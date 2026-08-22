"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { LocalizedLink as Link, withLocale } from "./localized-link";
import { Heart, Trash2, ShoppingBag, ChevronRight, Check, UserPlus } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { clearFavorites, removeFavorite, useFavorites, type FavoriteItem } from "@/lib/favorites";
import { formatFcfa } from "@/lib/kk/format";

/**
 * Page des favoris.
 *
 * Elle ne sait pas d'où vient la liste : le magasin la lui donne, qu'elle
 * provienne du navigateur ou du compte. Seul le bandeau du bas change de
 * message, pour dire au visiteur où sa sélection est conservée.
 */

/** Ajout au panier depuis un favori, avec confirmation brève sur le bouton. */
function AddButton({ item }: { item: FavoriteItem }) {
  const { add, openDrawer } = useCart();
  const [added, setAdded] = useState(false);

  if (item.stock <= 0) {
    return (
      <span className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm text-muted-foreground">
        Épuisé
      </span>
    );
  }

  // Produit décliné en contenances : le choix appartient au client, sur la fiche.
  if (item.hasVariants) {
    return (
      <Link
        href={item.path}
        className="kk-fill inline-flex h-11 items-center gap-1.5 rounded-full bg-deep px-5 text-sm font-semibold text-primary-foreground"
      >
        Choisir <ChevronRight className="h-4 w-4" />
      </Link>
    );
  }

  function handleAdd() {
    add(
      {
        productId: item.productId,
        slug: item.slug,
        brand: item.brand,
        name: item.name,
        image: item.image,
        path: item.path,
        priceCents: item.priceCents,
        stock: item.stock,
      },
      1,
    );
    setAdded(true);
    openDrawer();
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="kk-fill inline-flex h-11 items-center gap-1.5 rounded-full bg-deep px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2"
    >
      {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {added ? "Ajouté" : "Ajouter"}
    </button>
  );
}

export function FavoritesView() {
  const { items, ready, onAccount } = useFavorites();
  const pathname = usePathname();

  // Tant que le navigateur n'a pas rendu la main, on n'affiche ni la liste ni
  // l'état vide : montrer « aucun favori » puis la remplir ferait clignoter.
  if (!ready) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Chargement de votre sélection…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <Heart className="mx-auto mb-4 h-9 w-9 text-border" aria-hidden="true" />
        <p className="text-lg text-deep">Aucun favori pour l&rsquo;instant</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Touchez le cœur sur un produit pour le retrouver ici, sur tous vos appareils une fois
          connecté.
        </p>
        <Link
          href="/soins-visage"
          className="kk-fill mt-6 inline-block rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} produit{items.length > 1 ? "s" : ""} mémorisé
          {items.length > 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={clearFavorites}
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition hover:text-deep"
        >
          Tout retirer
        </button>
      </div>

      <ul className="grid gap-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <Link
              href={item.path}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand"
            >
              {item.image && (
                <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {item.brand}
              </p>
              <Link href={item.path} className="block text-base text-deep transition hover:underline">
                {item.name}
              </Link>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="figure text-base font-semibold text-deep">
                  {formatFcfa(item.priceCents)}
                </span>
                {item.oldPriceCents !== undefined && (
                  <span className="figure text-xs text-muted-foreground line-through">
                    {formatFcfa(item.oldPriceCents)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AddButton item={item} />
              <button
                type="button"
                onClick={() => removeFavorite(item.productId)}
                aria-label={`Retirer ${item.name} des favoris`}
                title="Retirer des favoris"
                className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-deep/50 hover:text-deep"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Où la sélection est-elle conservée ? Le visiteur sans compte doit
          savoir qu'elle tient au navigateur, et donc qu'elle se perd s'il
          change d'appareil ou vide son historique. */}
      {onAccount ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Votre sélection est enregistrée sur votre compte.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-sand/60 px-5 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Cette sélection est conservée dans ce navigateur.
          </p>
          <Link
            href={`/compte/connexion?suite=${withLocale(pathname, "/favoris")}`}
            className="kk-fill inline-flex items-center gap-1.5 rounded-full bg-deep px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <UserPlus className="h-4 w-4" /> La retrouver sur tous mes appareils
          </Link>
        </div>
      )}
    </div>
  );
}
