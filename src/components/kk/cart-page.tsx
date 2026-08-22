"use client";

import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "./localized-link";
import { Plus, Minus, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import { cartSubtotalFcfa } from "@/lib/kk/cart-totals";
import { BottleMotif } from "./motifs";

export function CartPageView() {
  const t = useTranslations("cart");
  const { lines, ready, setQuantity, remove } = useCart();
  const subtotal = cartSubtotalFcfa(lines);

  if (ready && lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <BottleMotif className="mx-auto h-24 text-deep/30" />
        <h1 className="mt-6 text-deep">{t("emptyTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("pageEmptyText")}</p>
        <Link
          href="/soins-visage"
          className="kk-fill mt-6 inline-block rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          {t("drawerEmptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-deep">{t("pageTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("pageIntro")}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        {/* Lignes */}
        <div>
          <div className="hidden border-b border-border pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-6">
            <span>{t("pageColumnProduct")}</span>
            <span className="w-28 text-center">{t("quantityLabel")}</span>
            <span className="w-24 text-right">{t("columnLineTotal")}</span>
          </div>
          <ul className="divide-y divide-border">
            {lines.map((line) => {
              const key = `${line.productId}:${line.variantId ?? ""}`;
              return (
                <li key={key} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                  <div className="flex gap-4">
                    <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]">
                      <BottleMotif className="h-3/5 text-deep/70" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {line.brand}
                      </p>
                      <Link href={line.path} className="text-sm font-medium text-foreground hover:text-deep">
                        {line.name}
                      </Link>
                      {line.variantLabel && (
                        <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                      )}
                      <p className="figure mt-1 text-sm text-deep">{formatFcfa(line.priceCents)}</p>
                      <button
                        type="button"
                        onClick={() => remove(line.productId, line.variantId)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("removeShort")}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-self-start rounded-full border border-border sm:w-28 sm:justify-center">
                    <button
                      type="button"
                      aria-label={t("decreaseShort")}
                      onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
                      className="grid h-9 w-9 place-items-center rounded-full text-deep hover:bg-sand"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="figure w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={t("increaseShort")}
                      onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}
                      className="grid h-9 w-9 place-items-center rounded-full text-deep hover:bg-sand"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="figure justify-self-end text-sm font-semibold text-deep sm:w-24 sm:text-right">
                    {formatFcfa(line.priceCents * line.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Résumé */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">
              {t("summaryTitleFull")}
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subtotal")}</dt>
                <dd className="figure font-medium text-deep">{formatFcfa(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("shippingLabel")}</dt>
                <dd className="text-right text-xs text-muted-foreground">{t("shippingCalculatedNextStep")}</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold text-deep">{t("totalEstimated")}</span>
              <span className="figure text-xl font-semibold text-deep">{formatFcfa(subtotal)}</span>
            </div>
            <Link
              href="/commande"
              className="kk-fill group mt-6 flex items-center justify-center gap-2 rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              {t("toCheckout")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("securePaymentNote")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
