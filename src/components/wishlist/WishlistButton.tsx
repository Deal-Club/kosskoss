"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleWishlistItem, useWishlist, type WishlistItem } from "@/lib/wishlist";

interface WishlistButtonProps {
  item: Omit<WishlistItem, "addedAt">;
  /** « icon » pour la pastille sur une vignette, « full » pour un bouton avec libellé. */
  variant?: "icon" | "full";
  className?: string;
}

export function WishlistButton({ item, variant = "icon", className }: WishlistButtonProps) {
  const t = useTranslations("wishlist");
  const { items, ready } = useWishlist();
  // Avant hydratation la liste est vide : le cœur part donc toujours éteint,
  // ce qui évite un écart entre le HTML du serveur et celui du navigateur.
  const active = ready && items.some((entry) => entry.productId === item.productId);
  const label = active ? t("remove") : t("add");

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggleWishlistItem(item)}
        aria-pressed={active}
        className={cn(
          "flex items-center justify-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-bold transition-colors",
          active
            ? "border-primary text-primary"
            : "border-border text-foreground hover:border-primary hover:text-primary",
          className,
        )}
      >
        <Heart className={cn("h-4 w-4", active && "fill-primary")} aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleWishlistItem(item)}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground transition-colors hover:border-primary hover:text-primary",
        active && "border-primary text-primary",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", active && "fill-primary")} aria-hidden />
    </button>
  );
}
