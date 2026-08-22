"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/CartProvider";
import { cartItemCount } from "@/lib/kk/cart-totals";
import { CIBLE_PANIER } from "@/lib/kk/fly-to-cart";

export function CartButton() {
  const t = useTranslations("cart");
  const { lines, openDrawer, ready } = useCart();
  const count = ready ? cartItemCount(lines) : 0;
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`${t("buttonAriaLabel", { count })}${count > 1 ? "s" : ""}`}
      // Cible du vol : la copie du produit converge vers le centre de ce
      // bouton, qui pulse à l'arrivée. Voir src/lib/kk/fly-to-cart.ts.
      {...{ [CIBLE_PANIER]: "" }}
      className="relative grid h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-deep px-1 text-[0.6rem] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
