"use client";

import { useState } from "react";
import { LocalizedLink as Link } from "./localized-link";
import { Plus, Check, Heart, ChevronRight } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { toggleFavorite, useFavorites, type FavoriteItem } from "@/lib/favorites";
import { volVersPanier } from "@/lib/kk/fly-to-cart";
import type { CartLine } from "@/lib/cart";
import type { KKProductView } from "@/types/kk";

/**
 * Les deux gestes disponibles depuis une vignette produit : ajouter au panier
 * et mettre en favori.
 *
 * Ils vivent dans un fichier client à part pour que la vignette elle-même
 * (`product-card.tsx`) reste un composant serveur : seules ces deux pastilles
 * traversent la frontière, pas la carte entière.
 */

/**
 * Ce dont le cœur a besoin, que le produit vienne d'une vignette
 * (`KKProductView`) ou d'une fiche (`KKProductDetail`).
 */
export interface FavoriteTarget {
  id: string;
  slug?: string;
  brand: string;
  name: string;
  priceFcfa: number;
  oldPriceFcfa?: number;
  image?: string | null;
  href?: string;
  stock?: number;
  hasVariants?: boolean;
}

/**
 * Une vignette n'est actionnable que si elle porte de quoi construire une ligne
 * de panier valable. Les données de démonstration de /preview n'ont ni `href` ni
 * `slug` : leurs boutons restent inertes plutôt que d'envoyer au panier un
 * identifiant que le serveur refuserait à la commande.
 */
function isActionable(product: FavoriteTarget): boolean {
  return Boolean(product.href && product.slug);
}

function toCartLine(product: KKProductView): Omit<CartLine, "quantity"> {
  return {
    productId: product.id,
    slug: product.slug ?? "",
    brand: product.brand,
    name: product.name,
    image: product.image ?? "",
    path: product.href ?? "",
    // `priceCents` porte le prix en FCFA entiers dans toute la boutique.
    priceCents: product.priceFcfa,
    stock: product.stock ?? 0,
  };
}

function toFavoriteItem(product: FavoriteTarget): Omit<FavoriteItem, "addedAt"> {
  return {
    productId: product.id,
    slug: product.slug ?? "",
    brand: product.brand,
    name: product.name,
    image: product.image ?? "",
    path: product.href ?? "",
    priceCents: product.priceFcfa,
    ...(product.oldPriceFcfa !== undefined ? { oldPriceCents: product.oldPriceFcfa } : {}),
    stock: product.stock ?? 0,
    hasVariants: product.hasVariants ?? false,
  };
}

const PASTILLE =
  // Le liseré clair n'est pas décoratif : au survol, le panneau d'information
  // (vert profond) monte sous cette pastille, elle aussi verte. Sans contour,
  // elle disparaîtrait dans l'aplat au moment précis où on veut la cliquer.
  // Sur le cadre blanc, où le contraste suffit déjà, il ne se voit pas.
  "grid h-11 w-11 place-items-center rounded-full shadow-lg shadow-deep/20 ring-1 ring-white/30 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/** Apparition au survol sur écran large ; toujours visible au doigt. */
const REVEAL =
  "motion-safe:sm:translate-y-2 motion-safe:sm:opacity-0 motion-safe:sm:group-hover:translate-y-0 motion-safe:sm:group-hover:opacity-100 motion-safe:sm:group-focus-within:translate-y-0 motion-safe:sm:group-focus-within:opacity-100";

/**
 * Ajout au panier en un geste, depuis la grille.
 *
 * Trois comportements, selon le produit :
 *   - **plusieurs contenances** — un lien vers la fiche. Le prix montré sur la
 *     vignette est celui du produit de base ; choisir une contenance à la place
 *     du client reviendrait à lui facturer un montant qu'il n'a pas vu ;
 *   - **rupture de stock** — bouton désactivé ;
 *   - **produit simple** — ajout immédiat, sans quitter la page.
 *
 * L'ajout ouvre le tiroir latéral, comme le clic sur l'icône du panier : le
 * client voit tout de suite ce qu'il vient de mettre dedans, son sous-total, et
 * peut commander sans chercher où aller.
 */
export function QuickAddButton({ product }: { product: KKProductView }) {
  const { add, openDrawer } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = (product.stock ?? 0) <= 0;

  if (!isActionable(product)) {
    return (
      <span
        aria-hidden="true"
        className={`absolute bottom-3 right-3 ${PASTILLE} ${REVEAL} bg-deep/40 text-primary-foreground`}
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </span>
    );
  }

  if (product.hasVariants) {
    return (
      <Link
        href={product.href as string}
        aria-label={`Choisir une contenance pour ${product.name}`}
        title="Choisir une contenance"
        className={`absolute bottom-3 right-3 ${PASTILLE} ${REVEAL} bg-deep text-primary-foreground hover:scale-105 focus-visible:scale-105`}
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2} />
      </Link>
    );
  }

  /**
   * Trois temps, dans cet ordre : la ligne entre au panier, la photo s'envole
   * vers l'icône, le tiroir s'ouvre.
   *
   * L'ajout d'abord — le panier doit être juste même si l'onglet passe en
   * arrière-plan pendant le vol et que l'animation est suspendue. L'ouverture
   * en dernier : le tiroir couvre la droite de l'écran, il masquerait la fin de
   * la trajectoire s'il s'ouvrait avant.
   */
  async function handleAdd(event: React.MouseEvent<HTMLButtonElement>) {
    add(toCartLine(product), 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);

    // `closest("article")` : la vignette entière, dont l'image sera clonée.
    await volVersPanier(event.currentTarget.closest("article"));
    openDrawer();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        aria-label={outOfStock ? `${product.name} — épuisé` : `Ajouter ${product.name} au panier`}
        title={outOfStock ? "Épuisé" : "Ajouter au panier"}
        className={`absolute bottom-3 right-3 ${PASTILLE} ${REVEAL} bg-deep text-primary-foreground enabled:hover:scale-105 enabled:focus-visible:scale-105 disabled:cursor-not-allowed disabled:bg-deep/30`}
      >
        {added ? (
          <Check className="h-5 w-5" strokeWidth={2.4} />
        ) : (
          <Plus className="h-5 w-5" strokeWidth={2} />
        )}
      </button>
      {/* Confirmation destinée aux lecteurs d'écran : la coche est visuelle. */}
      <span role="status" aria-live="polite" className="sr-only">
        {added ? `${product.name} ajouté au panier` : ""}
      </span>
    </>
  );
}

/**
 * Cœur des favoris.
 *
 * Sans compte, la liste reste dans le navigateur ; une fois connecté, elle est
 * versée sur le compte — voir `src/lib/favorites.ts`. Le bouton, lui, ne connaît
 * pas cette distinction.
 */
export function FavoriteHeart({
  product,
  className = "",
  size = "card",
}: {
  product: FavoriteTarget;
  className?: string;
  /** « card » : pastille sur une vignette. « round » : bouton de la fiche produit. */
  size?: "card" | "round";
}) {
  const { items, ready } = useFavorites();
  // Avant hydratation la liste est vide : le cœur part toujours éteint, ce qui
  // évite un écart entre le HTML du serveur et celui du navigateur.
  const active = ready && items.some((entry) => entry.productId === product.id);
  const label = active ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`;

  if (!isActionable(product)) return null;

  const base =
    size === "round"
      ? "grid h-12 w-12 shrink-0 place-items-center rounded-full border transition"
      : "grid h-9 w-9 place-items-center rounded-full border backdrop-blur-sm transition";

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(toFavoriteItem(product))}
      aria-pressed={active}
      aria-label={label}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`${base} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 ${
        active
          ? "border-deep bg-deep text-primary-foreground"
          : "border-border bg-card/85 text-deep hover:border-deep/50 hover:bg-sand"
      } ${className}`}
    >
      <Heart
        className={size === "round" ? "h-5 w-5" : "h-4 w-4"}
        strokeWidth={2}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}
