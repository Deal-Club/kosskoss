"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/cart/CartProvider";
import {
  formatCents,
  getCartSnapshot,
  MAX_QUANTITY_PER_LINE,
  replaceCart,
} from "@/lib/cart";
import type { CartLine } from "@/lib/cart";
import { cartLineKey } from "@/lib/variantPricing";

// Le panier stocké dans le navigateur peut dater : au premier affichage on
// redemande au serveur les prix et les stocks réels, puis on réécrit le
// magasin. Les prix affichés sont ainsi toujours ceux de la base.
function useRevalidatedCart(): "none" | "updated" | "removed" {
  const [notice, setNotice] = useState<"none" | "updated" | "removed">("none");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const stored = getCartSnapshot();
    if (stored.length === 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Format variant-aware : une entrée par ligne, avec son variantId.
          // Le serveur renvoie une ligne par paire (productId, variantId) et
          // ne fusionne jamais deux volumes d'un même produit.
          body: JSON.stringify({
            lines: stored.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
            })),
          }),
        });
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { lines?: Omit<CartLine, "quantity">[] };
        // Clé composite pour distinguer deux volumes du même produit.
        const fresh = new Map(
          (data.lines ?? []).map((line) => [cartLineKey(line.productId, line.variantId), line]),
        );

        const next: CartLine[] = [];
        let changed = false;
        let removed = false;

        for (const line of stored) {
          const key = cartLineKey(line.productId, line.variantId);
          const server = fresh.get(key);
          if (!server) {
            removed = true;
            changed = true;
            continue;
          }
          const quantity = Math.max(1, Math.min(line.quantity, server.stock || 1));
          if (server.priceCents !== line.priceCents || quantity !== line.quantity) changed = true;
          // Les champs d'identité (variantId, variantLabel) sont conservés depuis
          // le stockage local pour ne pas les perdre si le serveur les omettait,
          // mais le serveur les renvoie aussi (voir route.ts).
          next.push({
            ...server,
            variantId: line.variantId,
            variantLabel: line.variantLabel,
            quantity,
          });
        }

        if (cancelled) return;
        replaceCart(next);
        if (changed) setNotice(removed ? "removed" : "updated");
      } catch {
        // Hors ligne : on conserve l'affichage local, le serveur revérifiera
        // tout au moment de la commande.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return notice;
}

export function CartView() {
  const t = useTranslations("cart");
  const { lines, totals, ready, campaign, setQuantity, remove, clear } = useCart();
  const notice = useRevalidatedCart();

  if (!ready) {
    return (
      <p className="rounded-sm border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-white px-6 py-14 text-center">
        <ShoppingCart className="mx-auto mb-4 h-10 w-10 text-border" aria-hidden />
        <h2 className="text-xl font-black text-foreground">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("emptyText")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {notice !== "none" && (
          <p
            role="status"
            className="mb-4 rounded-sm border border-primary bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground"
          >
            {notice === "removed" ? t("removedUnavailable") : t("revalidated")}
          </p>
        )}

        <ul className="divide-y divide-border rounded-sm border border-border bg-white">
          {lines.map((line) => (
            <li key={`${line.productId}::${line.variantId ?? ""}`} className="flex gap-4 p-4">
              <Link
                href={line.path}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-muted"
              >
                {line.image && (
                  <Image
                    src={line.image}
                    alt={`${line.brand} ${line.name}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {line.brand}
                </p>
                <Link
                  href={line.path}
                  className="block text-sm font-semibold text-foreground hover:text-primary"
                >
                  {line.name}
                </Link>
                {line.variantLabel && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{line.variantLabel}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("columnUnitPrice")}: {formatCents(line.priceCents)}
                </p>
                {line.stock > 0 && line.stock <= 5 && (
                  <p className="mt-1 text-xs font-semibold text-primary">
                    {t("onlyLeft", { count: line.stock })}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-sm border border-border">
                    <button
                      type="button"
                      aria-label={t("decrease")}
                      onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <label className="sr-only" htmlFor={`qty-${line.productId}-${line.variantId ?? ""}`}>
                      {t("quantityLabel")}
                    </label>
                    <input
                      id={`qty-${line.productId}-${line.variantId ?? ""}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, line.stock))}
                      value={line.quantity}
                      onChange={(event) =>
                        setQuantity(line.productId, line.variantId, Number.parseInt(event.target.value, 10))
                      }
                      className="w-12 border-x border-border bg-transparent py-1 text-center text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      aria-label={t("increase")}
                      disabled={line.quantity >= Math.min(MAX_QUANTITY_PER_LINE, line.stock)}
                      onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.productId, line.variantId)}
                    aria-label={t("removeLabel", { name: `${line.brand} ${line.name}` })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {t("remove")}
                  </button>
                </div>
              </div>

              <p className="shrink-0 text-right text-base font-black text-foreground">
                {formatCents(line.priceCents * line.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            {t("continueShopping")}
          </Link>
          <button
            type="button"
            onClick={clear}
            className="text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            {t("clear")}
          </button>
        </div>
      </div>

      {/* Récapitulatif : prix total TTC, frais de port et part de TVA — les
          informations exigées par la Preisangabenverordnung § 3. */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-sm border border-border bg-white p-5">
          <h2 className="mb-4 text-lg font-black text-foreground">{t("summaryTitle")}</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {t("subtotal")} ({t("itemCount", { count: totals.itemCount })})
              </dt>
              <dd className="font-semibold text-foreground">{formatCents(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("shipping")}</dt>
              <dd className="font-semibold text-foreground">
                {totals.shippingCents === 0 ? t("shippingFree") : formatCents(totals.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-black text-foreground">{t("total")}</dt>
              <dd className="font-black text-primary">{formatCents(totals.totalCents)}</dd>
            </div>
          </dl>

          {/* Le détail du taux et du montant de TVA a été retiré à la demande
              du commerçant, au profit de la mention simple : § 1 PAngV impose
              d'indiquer que le prix comprend la taxe, pas d'en publier le
              calcul. Le détail reste sur la facture, où il est obligatoire. */}
          <p className="mt-1 text-xs text-muted-foreground">{t("vatNote")}</p>

          <p className="mt-3 flex items-start gap-2 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              {/* Plus aucun montant à atteindre : le standard est gratuit dès le
                  premier euro. La mention de campagne reste affichée pour les
                  actions en cours, même si elle n'accorde plus de remise. */}
              {campaign.freeShipping ? t("campaignFreeShipping") : t("shippingStandardHint")}
            </span>
          </p>

          <Link
            href="/commande"
            className="mt-4 block rounded-sm bg-primary px-5 py-3 text-center text-sm font-black text-primary-foreground hover:brightness-110"
          >
            {t("toCheckout")}
          </Link>

          <p className="mt-3 text-xs text-muted-foreground">{t("deliveryTime")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("shippingRule")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("withdrawalHint")}</p>
        </div>
      </aside>
    </div>
  );
}
