"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import type { KKProductDetail } from "@/server/kk/product";
import { volVersPanier } from "@/lib/kk/fly-to-cart";
import { FavoriteHeart } from "./product-actions";

export function AddToCart({ product }: { product: KKProductDetail }) {
  const { add, openDrawer } = useCart();
  const [variantId, setVariantId] = useState<string | undefined>(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const priceFcfa = variant?.priceFcfa ?? product.priceFcfa;
  const oldPriceFcfa = variant?.oldPriceFcfa ?? product.oldPriceFcfa;
  const outOfStock = product.stock <= 0;

  async function handleAdd() {
    add(
      {
        productId: product.id,
        variantId: variant?.id,
        variantLabel: variant?.label,
        slug: product.slug,
        brand: product.brand,
        name: product.name,
        image: product.image ?? "",
        path: product.href,
        priceCents: priceFcfa,
        stock: product.stock,
      },
      qty,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);

    // Même geste que depuis une vignette. Le vol part de la galerie de la
    // fiche, repérée par son attribut : sur cette page, le bouton n'est pas
    // dans le même bloc que la photo.
    await volVersPanier(document.querySelector<HTMLElement>("[data-visuel-produit]"));
    openDrawer();
  }

  return (
    <div>
      {/* Prix (suit la variante sélectionnée) */}
      <div className="flex items-baseline gap-3">
        <span className="figure text-2xl font-semibold text-deep">{formatFcfa(priceFcfa)}</span>
        {oldPriceFcfa && (
          <span className="figure text-base text-muted-foreground line-through">
            {formatFcfa(oldPriceFcfa)}
          </span>
        )}
      </div>

      {/* Sélecteur de variante (contenance) */}
      {product.variants.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Contenance
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const active = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-deep bg-deep text-primary-foreground"
                      : "border-border bg-cream text-deep hover:border-deep/50"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Quantité + ajout */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-border bg-cream">
          <button
            type="button"
            aria-label="Diminuer la quantité"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-11 w-11 place-items-center rounded-full text-deep transition hover:bg-sand disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="figure w-8 text-center text-sm font-semibold text-deep" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
            className="grid h-11 w-11 place-items-center rounded-full text-deep transition hover:bg-sand"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Sur mobile, l'icône seule.
            « Ajouter au panier » ne tenait pas sur la largeur restante à côté
            du sélecteur de quantité et du cœur : le texte se cassait sur trois
            lignes et le bouton devenait un disque démesuré. Le libellé revient
            dès qu'il y a la place, et `aria-label` le porte en permanence pour
            les lecteurs d'écran.
            « Indisponible » reste écrit à toutes les tailles : un bouton grisé
            sans un mot n'explique pas pourquoi il ne répond pas. */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          aria-label={outOfStock ? "Produit indisponible" : "Ajouter au panier"}
          className="kk-fill group inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 sm:px-7"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          {outOfStock ? "Indisponible" : <span className="hidden sm:inline">Ajouter au panier</span>}
        </button>

        <FavoriteHeart
          size="round"
          product={{
            id: product.id,
            slug: product.slug,
            brand: product.brand,
            name: product.name,
            priceFcfa: product.priceFcfa,
            oldPriceFcfa: product.oldPriceFcfa,
            image: product.image,
            href: product.href,
            stock: product.stock,
            hasVariants: product.variants.length > 0,
          }}
        />
      </div>

      {/* Confirmation accessible */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-3 flex items-center gap-2 text-sm text-deep transition ${
          added ? "opacity-100" : "opacity-0"
        }`}
      >
        {added && (
          <>
            <Check className="h-4 w-4" /> Ajouté au panier —{" "}
            <button type="button" onClick={openDrawer} className="underline underline-offset-2">
              voir le panier
            </button>
          </>
        )}
      </p>
    </div>
  );
}
