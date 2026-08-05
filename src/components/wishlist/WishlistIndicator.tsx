"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useWishlist } from "@/lib/wishlist";

/** Icône du header avec le nombre d'articles mémorisés. */
export function WishlistIndicator({ className }: { className?: string }) {
  const t = useTranslations("wishlist");
  const common = useTranslations("common");
  const { count, ready } = useWishlist();
  // Avant hydratation le compteur reste masqué : le serveur ignore le contenu
  // du navigateur et afficherait sinon un chiffre faux.
  const visible = ready ? count : 0;

  return (
    <Link
      href="/favoris"
      aria-label={visible > 0 ? t("count", { count: visible }) : t("title")}
      className={className ?? "relative flex flex-col items-center gap-1 hover:text-primary"}
    >
      <span className="relative">
        <Heart className="h-5 w-5" />
        {visible > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 font-black text-primary-foreground">
            {visible}
          </span>
        )}
      </span>
      <span className="hidden sm:inline">{common("wishlist")}</span>
    </Link>
  );
}
