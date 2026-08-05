"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { MAX_QUANTITY_PER_LINE } from "@/lib/cart";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  /** Identifiant en base — c'est la seule donnée dont le serveur se sert. */
  productId: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  /** Chemin de la fiche produit, tel que fourni par `product.href`. */
  path: string;
  /** Prix unitaire TTC en centimes. */
  priceCents: number;
  stock: number;
  /** Affiche le sélecteur de quantité ; désactivé sur les vignettes de liste. */
  withQuantity?: boolean;
  /**
   * Affiche « acheter maintenant » au-dessus du panier. Réservé à la fiche
   * produit : sur une vignette de liste, deux boutons empilés mangeraient la
   * hauteur de la grille pour une décision qui n'est pas encore prise.
   */
  withBuyNow?: boolean;
  className?: string;
  /** Variation choisie (volume) ; absente pour un produit simple. */
  variantId?: string;
  variantLabel?: string;
}

export function AddToCartButton({
  productId,
  slug,
  brand,
  name,
  image,
  path,
  priceCents,
  stock,
  withQuantity = true,
  withBuyNow = false,
  className,
  variantId,
  variantLabel,
}: AddToCartButtonProps) {
  const t = useTranslations("cart");
  const router = useRouter();
  const { add, ready, openDrawer } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const soldOut = stock <= 0;
  const disabled = soldOut || !ready;
  const maxQuantity = Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, stock));

  function ajouter() {
    add({ productId, slug, brand, name, image, path, priceCents, stock, variantId, variantLabel }, quantity);
  }

  function handleAdd() {
    if (disabled) return;
    ajouter();
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2500);
    // Le tiroir s'ouvre automatiquement : un client qui clique plusieurs fois
    // parce qu'il doute que le premier clic ait fonctionné arrive tout droit
    // au double ajout. La confirmation doit donc être impossible à manquer,
    // pas seulement un changement de couleur sur un bouton qu'il a peut-être
    // déjà quitté des yeux.
    openDrawer();
  }

  /**
   * Achat direct : même ajout, puis la caisse, sans repasser par le panier.
   * L'article y est bien déposé au passage — la caisse lit le panier, et une
   * commande sans ligne n'aurait aucun sens. Le tiroir ne s'ouvre pas ici : la
   * page suivante est déjà la confirmation la plus directe possible.
   */
  function handleBuyNow() {
    if (disabled) return;
    ajouter();
    router.push("/commande");
  }

  const quantitySelector = withQuantity && !soldOut && (
    <div className="flex items-center rounded-sm border border-border">
      <button
        type="button"
        aria-label={t("decrease")}
        disabled={quantity <= 1}
        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
        className="flex h-10 w-10 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-10 text-center text-sm font-bold" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={t("increase")}
        disabled={quantity >= maxQuantity}
        onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
        className="flex h-10 w-10 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );

  const BOUTON = "flex flex-1 items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-bold transition-colors";

  const addToCartButton = (
    <button
      type="button"
      onClick={handleAdd}
      // `ready` évite qu'un clic parte avant que le magasin ne soit relu :
      // la quantité s'ajouterait alors à un panier considéré comme vide.
      disabled={disabled}
      aria-live="polite"
      className={cn(
        BOUTON,
        soldOut
          ? "cursor-not-allowed bg-muted text-muted-foreground"
          : added
            ? "bg-[#16a34a] text-white"
            : withBuyNow
              // En second rôle sous « acheter maintenant » : le contour évite
              // deux aplats de même poids qui se disputeraient le regard.
              ? "border border-primary bg-white text-primary hover:bg-muted"
              : "bg-primary text-primary-foreground hover:brightness-110",
        !ready && !soldOut && "opacity-70",
      )}
    >
      {soldOut ? (
        t("soldOut")
      ) : added ? (
        <>
          <Check className="h-4 w-4" aria-hidden />
          {t("added")}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" aria-hidden />
          {t("addToCart")}
        </>
      )}
    </button>
  );

  // Sans achat direct, tout tient sur une ligne : c'est le cas des vignettes.
  if (!withBuyNow) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {quantitySelector}
        {addToCartButton}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        {quantitySelector}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={disabled}
          className={cn(
            BOUTON,
            soldOut
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:brightness-110",
            !ready && !soldOut && "opacity-70",
          )}
        >
          {soldOut ? t("soldOut") : t("buyNow")}
          {!soldOut && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <div className="flex">{addToCartButton}</div>
    </div>
  );
}
