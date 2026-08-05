"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCents } from "@/lib/cart";
import { useRecentlyViewed } from "@/lib/recentlyViewed";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function RecentlyViewedView() {
  const t = useTranslations("recentlyViewed");
  const { items, ready } = useRecentlyViewed();

  // Tant que l'onglet n'a pas rendu la main, on n'affiche ni la liste ni
  // l'état vide : afficher « rien à montrer » puis la remplir donnerait un clignotement.
  if (!ready) {
    return (
      <div className="rounded-sm border border-border bg-white p-8 text-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-white p-8 text-center">
        <Eye className="mx-auto mb-3 h-8 w-8 text-border" aria-hidden />
        <p className="font-bold text-foreground">{t("emptyTitle")}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("emptyText")}</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{t("count", { count: items.length })}</p>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex flex-col gap-4 rounded-sm border border-border bg-white p-4 sm:flex-row sm:items-center"
          >
            <Link
              href={item.path}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-border"
            >
              {item.image ? (
                <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
              ) : null}
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {item.brand}
              </p>
              <Link href={item.path} className="block font-bold text-foreground hover:text-primary">
                {item.name}
              </Link>
              <p className="mt-1 text-lg font-black text-foreground">{formatCents(item.priceCents)}</p>
            </div>

            <div className="shrink-0">
              <AddToCartButton
                productId={item.productId}
                slug={item.slug}
                brand={item.brand}
                name={item.name}
                image={item.image}
                path={item.path}
                priceCents={item.priceCents}
                stock={99}
                withQuantity={false}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
