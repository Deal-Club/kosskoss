"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Minus, ShoppingBag, Check, Zap } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import type { KKProductDetail } from "@/server/kk/product";
import { volVersPanier } from "@/lib/kk/fly-to-cart";
import { FavoriteHeart } from "./product-actions";
import { withLocale } from "./localized-link";

export function AddToCart({ product }: { product: KKProductDetail }) {
  const t = useTranslations("product");
  const { add, openDrawer } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [variantId, setVariantId] = useState<string | undefined>(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const priceFcfa = variant?.priceFcfa ?? product.priceFcfa;
  const oldPriceFcfa = variant?.oldPriceFcfa ?? product.oldPriceFcfa;
  const outOfStock = product.stock <= 0;

  /** La ligne de panier décrite par les choix en cours (variante, quantité). */
  function ligneCourante() {
    return {
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
    };
  }

  /**
   * Achat direct : on dépose la ligne au panier et on file au tunnel.
   *
   * Le panier reste le passage obligé — c'est lui qui porte l'état de la
   * commande, et le tunnel le lit. La différence avec l'ajout ordinaire tient
   * à ce qui NE se produit pas : ni vol vers le panier, ni ouverture du
   * tiroir, ni message de confirmation. Trois interruptions qui, sur un achat
   * décidé, ne font que retarder le paiement.
   */
  function handleBuyNow() {
    add(ligneCourante(), qty);
    router.push(withLocale(pathname, "/commande"));
  }

  async function handleAdd() {
    add(ligneCourante(), qty);
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

      {/* TOTAL, dès que la quantité dépasse un.

          Le grand prix reste le prix UNITAIRE : c'est lui qui se compare d'une
          fiche à l'autre, et le multiplier en place ferait croire à un produit
          plus cher. Le total s'ajoute donc en dessous, avec le détail du calcul
          — on voit à la fois ce qu'on paie et pourquoi.
          Il ne s'affiche pas à l'unité : « Total : 20 500 FCFA » sous
          « 20 500 FCFA » n'apprend rien et alourdit le bloc d'achat. */}
      {qty > 1 && (
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {t("totalLabel")}{" "}
          <span className="figure text-base font-semibold text-deep">
            {formatFcfa(priceFcfa * qty)}
          </span>{" "}
          <span className="figure">
            ({qty} × {formatFcfa(priceFcfa)})
          </span>
        </p>
      )}

      {/* Sélecteur de variante (contenance) */}
      {product.variants.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("contentLabel")}
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

      {/* ACHAT DIRECT EN PREMIER, et seul sur sa ligne.

          C'est le geste que la fiche doit servir : sur une boutique où le
          paiement se fait par Mobile Money en quelques secondes, envoyer tout
          le monde par le panier ajoute une étape à une décision déjà prise.
          « Ajouter au panier » reste juste en dessous, pour qui compose une
          commande de plusieurs produits — les deux publics sont réels, l'ordre
          dit lequel est le plus courant.

          Le laiton le distingue du vert profond de l'ajout : deux boutons de
          même couleur l'un sous l'autre ne se hiérarchisent que par leur
          position, ce qui est trop peu pour l'action principale.

          LAITON D'ENCRE et non laiton plein : le libellé est en blanc pur, et
          du blanc sur le laiton vif ne tient que 3,2:1 — illisible en plein
          soleil sur un téléphone, ce qui est la situation d'usage. Sur ce
          laiton foncé, il tient 7,9:1. */}
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={outOfStock}
        className="kk-fill kk-fill-deep group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-ink px-7 py-4 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap className="h-4 w-4 shrink-0" />
        {outOfStock ? t("unavailable") : t("payNow")}
      </button>

      {/* Quantité + ajout */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-border bg-cream">
          <button
            type="button"
            aria-label={t("decreaseQuantityShort")}
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
            aria-label={t("increaseQuantityShort")}
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
          aria-label={outOfStock ? t("unavailableAria") : t("addToCart")}
          className="kk-fill group inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 sm:px-7"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          {outOfStock ? t("unavailable") : <span className="hidden sm:inline">{t("addToCart")}</span>}
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
            <Check className="h-4 w-4" /> {t("addedToCart")}{" "}
            <button type="button" onClick={openDrawer} className="underline underline-offset-2">
              {t("viewCartLink")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
