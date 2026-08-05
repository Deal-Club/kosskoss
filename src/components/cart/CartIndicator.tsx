"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/cart";

// Destiné au Header. Le compteur reste vide au rendu serveur et n'apparaît
// qu'une fois le panier relu dans le navigateur : aucun écart d'hydratation.

export function CartIndicator({ className }: { className?: string }) {
  const t = useTranslations("cart");
  const { totals, ready } = useCart();
  const count = ready ? totals.itemCount : 0;

  return (
    <Link
      href="/panier"
      className={className ?? "relative flex items-center gap-2 text-sm font-semibold"}
      aria-label={
        count > 0 ? t("indicatorWithItems", { count, total: formatCents(totals.totalCents) }) : t("title")
      }
    >
      <span className="relative">
        <ShoppingCart className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-black text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden sm:inline">{t("title")}</span>
    </Link>
  );
}
