"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CampaignCountdown } from "@/components/CampaignCountdown";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { formatCents } from "@/lib/cart";
import type { Product } from "@/types/home";

export function ProductPurchaseBox({ product }: { product: Product }) {
  const t = useTranslations("product");
  const inStock = product.inStock !== false;

  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = variants.find((v) => v.id === selectedId);
  const displayPriceCents = selected?.priceCents ?? product.priceCents ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border p-4">
      <div>
        {hasVariants ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{t("chooseVolume")}</p>
            {!selected && (
              <p className="text-3xl font-black text-primary">
                <span className="text-sm font-normal text-muted-foreground">{t("fromPrice")} </span>
                {formatCents(product.priceCents ?? 0)}
              </p>
            )}
            <ul className="flex flex-col gap-1.5">
              {variants.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    aria-pressed={selectedId === v.id}
                    className={`flex w-full items-center justify-between rounded-sm border px-3 py-2 text-sm transition-colors ${
                      selectedId === v.id ? "border-primary bg-muted font-bold" : "border-border hover:bg-muted"
                    }`}
                  >
                    <span>{v.label}</span>
                    <span className="font-bold text-primary">{formatCents(v.priceCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {selected && <p className="text-3xl font-black text-primary">{formatCents(selected.priceCents)}</p>}
          </div>
        ) : (
          <>
            {product.oldPrice && (
              <p className="text-sm text-muted-foreground">
                {t("originalPrice")} <span className="line-through">{product.oldPrice}</span>
              </p>
            )}
            <div className="flex items-center gap-2">
              <p className="text-3xl font-black text-primary">{product.price}</p>
              {product.badge && (
                <span className="rounded-sm bg-badge px-2 py-0.5 text-xs font-bold text-badge-foreground">
                  {product.badge}
                </span>
              )}
            </div>
            {/* Vente flash : le décompte est l'argument principal, il vient juste
                sous le prix. Les autres campagnes affichent leur pastille et rien
                de plus — un compte à rebours sur une offre de deux semaines
                fabrique une urgence qui n'existe pas. */}
            {product.promoCountdown && product.promoEndsAt && (
              <div className="mt-2">
                <CampaignCountdown endsAt={product.promoEndsAt} />
              </div>
            )}
          </>
        )}

        {/* La mention doit refléter le tarif réellement appliqué au panier :
            une indication de frais de port inexacte est une information
            trompeuse au sens de Google Merchant Center et de la PAngV. Le
            standard étant gratuit sans minimum d'achat, elle ne dépend plus du
            prix de l'article ; l'express reste annoncé par `fastDelivery`. */}
        <p className="text-xs text-muted-foreground">{t("vatNoteFreeShipping")}</p>
      </div>

      <p className={`text-sm font-semibold ${inStock ? "text-foreground" : "text-muted-foreground"}`}>
        {inStock ? `✓ ${t("inStock")}` : t("outOfStock")}
      </p>

      {/* Achat direct, quantité et ajout au panier : le composant refuse de
          dépasser le stock réel et désactive tout quand l'article est épuisé.
          C'est ici, et seulement ici, que « acheter maintenant » a sa place :
          la décision d'achat se prend sur la fiche, pas sur une vignette.
          Quand le produit a des variations et qu'aucune n'est sélectionnée,
          on affiche un bouton désactivé libellé « Choisissez un volume » au
          lieu de tricher avec stock=0 qui afficherait « Épuisé ». */}
      {hasVariants && !selected ? (
        <button
          type="button"
          disabled
          className="w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground opacity-50 cursor-not-allowed"
        >
          {t("chooseVolume")}
        </button>
      ) : (
        <AddToCartButton
          productId={product.id ?? ""}
          slug={product.slug ?? ""}
          brand={product.brand}
          name={product.name}
          image={product.image}
          path={product.href}
          priceCents={displayPriceCents}
          stock={product.stock ?? 0}
          variantId={selected?.id}
          variantLabel={selected?.label}
          withBuyNow
        />
      )}

      {product.id && (
        <WishlistButton
          variant="full"
          item={{
            productId: product.id,
            slug: product.slug ?? "",
            brand: product.brand,
            name: product.name,
            image: product.image,
            path: product.href,
            priceCents: product.priceCents ?? 0,
          }}
        />
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> {t("fastDelivery")}
        </p>
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> {t("expressDelivery")}
        </p>
        <p className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("warranty")}
        </p>
      </div>
    </div>
  );
}
