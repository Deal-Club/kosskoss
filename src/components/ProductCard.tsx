import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { formatRating } from "@/lib/formatRating";
import type { Product } from "@/types/home";

// Composant partagé : il est rendu côté serveur (grilles de la page d'accueil)
// comme côté client (navigateur de catégorie filtrable). D'où les hooks
// "useTranslations"/"useLocale", qui fonctionnent dans les deux contextes.
export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("product");
  const locale = useLocale();

  return (
    <div className="relative h-full">
      {product.id && (
        <WishlistButton
          className="absolute top-4 right-4 z-20"
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
      <Link
      href={product.href}
      className="group flex h-full flex-col rounded-lg border border-border bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative mb-2 min-h-6">
        {product.badge && (
          <span className="absolute top-0 left-0 z-10 rounded-sm bg-badge px-2 py-0.5 text-[11px] font-bold text-badge-foreground">
            {product.badge}
          </span>
        )}
      </div>
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-sm bg-muted">
        <Image
          src={product.image}
          alt={product.alt}
          fill
          sizes="(min-width: 1024px) 16vw, 45vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <p className="eyebrow truncate text-[0.58rem] text-muted-foreground">
        {product.brand}
      </p>
      <p className="mt-1 mb-1 line-clamp-2 font-heading text-sm leading-snug font-bold text-foreground transition-colors group-hover:text-primary">
        {product.name}
      </p>
      {typeof product.rating === "number" && (
        <p className="messwert mb-2 flex items-center gap-1 text-xs font-semibold text-foreground">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {formatRating(product.rating, locale)}
        </p>
      )}
      {/* Les caractéristiques du bois sont des mesures : longueur, humidité,
          pouvoir calorifique. Elles se lisent en colonne, en chasse fixe. */}
      <ul className="mb-3 space-y-0.5 text-[0.7rem] text-muted-foreground">
        {product.bullets.map((bullet) => (
          <li key={bullet} className="messwert truncate">
            {bullet}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="flex items-end gap-2">
          {product.oldPrice && (
            <span className="messwert text-xs text-muted-foreground line-through">
              {product.oldPrice}
            </span>
          )}
          <span className="messwert text-lg font-bold text-primary">{product.price}</span>
        </div>
        {product.inStock === false && (
          <span className="text-[11px] font-semibold text-muted-foreground">{t("onRequest")}</span>
        )}
      </div>
    </Link>
    </div>
  );
}
