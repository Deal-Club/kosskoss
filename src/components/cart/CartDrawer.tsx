"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Minus, Plus, ShoppingCart, Trash2, Truck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents, MAX_QUANTITY_PER_LINE } from "@/lib/cart";
import { useDismissable } from "@/lib/useDismissable";

// Panier latéral.
//
// Un bouton flottant apparaît à droite dès que le panier contient un article ;
// il ouvre un tiroir qui liste les lignes, permet d'ajuster les quantités et
// mène directement à la caisse. Les moyens de paiement sont rendus côté serveur
// et passés en `paymentSlot` : le tiroir reste un composant client sans avoir à
// interroger la base.

export function CartDrawer({ paymentSlot }: { paymentSlot?: ReactNode }) {
  const t = useTranslations("cart");
  const { lines, totals, ready, setQuantity, remove, drawerOpen, openDrawer, closeDrawer } =
    useCart();
  const open = drawerOpen;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useDismissable(open, closeDrawer);

  // Le focus entre dans le panneau à l'ouverture et revient sur le bouton à la
  // fermeture : au clavier, on ne repart pas du haut de la page. `wasOpen`
  // évite de happer le focus au chargement, quand le tiroir n'a jamais été ouvert.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeButtonRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const count = ready ? totals.itemCount : 0;

  // Vider le panier depuis le tiroir le fait disparaître. Sans cette remise à
  // zéro, `open` resterait vrai : le défilement de la page resterait bloqué et
  // le tiroir se rouvrirait seul au prochain ajout. L'ajustement se fait pendant
  // le rendu — React relance aussitôt, avant tout affichage et tout effet.
  if (open && count === 0) closeDrawer();

  // Rien à montrer tant que le panier est vide : ni bouton, ni panneau.
  if (!ready || count === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDrawer}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed top-1/2 right-0 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-sm bg-primary py-3 pr-3 pl-3.5 text-primary-foreground shadow-lg transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:hover:pr-4"
      >
        <span className="relative">
          <ShoppingCart className="h-5 w-5" aria-hidden />
          <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] leading-none font-black text-primary">
            {count > 99 ? "99+" : count}
          </span>
        </span>
        <span className="sr-only">
          {t("indicatorWithItems", { count, total: formatCents(totals.totalCents) })}
        </span>
        <span className="hidden text-sm font-black lg:inline" aria-hidden>
          {formatCents(totals.totalCents)}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t("drawerClose")}
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/50 motion-safe:animate-in motion-safe:fade-in"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-200"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id={titleId} className="text-lg font-black text-foreground">
                {t("drawerTitle")}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  ({t("itemCount", { count })})
                </span>
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label={t("drawerClose")}
                className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {lines.map((line) => (
                <li key={`${line.productId}::${line.variantId ?? ""}`} className="flex gap-3 p-4">
                  <Link
                    href={line.path}
                    onClick={closeDrawer}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-muted"
                  >
                    {line.image && (
                      <Image
                        src={line.image}
                        alt={`${line.brand} ${line.name}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {line.brand}
                    </p>
                    <Link
                      href={line.path}
                      onClick={closeDrawer}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {line.name}
                    </Link>
                    {line.variantLabel && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{line.variantLabel}</p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-sm border border-border">
                        <button
                          type="button"
                          aria-label={t("decrease")}
                          onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-foreground hover:bg-muted"
                        >
                          <Minus className="h-3 w-3" aria-hidden />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-foreground">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={t("increase")}
                          disabled={line.quantity >= Math.min(MAX_QUANTITY_PER_LINE, line.stock)}
                          onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" aria-hidden />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(line.productId, line.variantId)}
                        aria-label={t("removeLabel", { name: `${line.brand} ${line.name}` })}
                        className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-primary"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <p className="shrink-0 text-right text-sm font-black text-foreground">
                    {formatCents(line.priceCents * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <footer className="border-t border-border bg-muted/40 px-5 py-4">
              <p className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                {/* Le franco de port n'a plus de seuil : le standard est gratuit
                    quel que soit le montant. Le tiroir rappelle donc la règle,
                    au lieu du montant qui manquait autrefois pour l'atteindre. */}
                <span>{t("shippingStandardHint")}</span>
              </p>

              <dl className="mb-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("subtotal")}</dt>
                  <dd className="font-semibold text-foreground">
                    {formatCents(totals.subtotalCents)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("shipping")}</dt>
                  <dd className="font-semibold text-foreground">
                    {totals.shippingCents === 0
                      ? t("shippingFree")
                      : formatCents(totals.shippingCents)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base">
                  <dt className="font-black text-foreground">{t("total")}</dt>
                  <dd className="font-black text-primary">{formatCents(totals.totalCents)}</dd>
                </div>
              </dl>

              <Link
                href="/commande"
                onClick={closeDrawer}
                className="block rounded-sm bg-primary px-5 py-3 text-center text-sm font-black text-primary-foreground transition-all hover:brightness-110"
              >
                {t("toCheckout")}
              </Link>
              <Link
                href="/panier"
                onClick={closeDrawer}
                className="mt-2 block text-center text-sm font-semibold text-primary hover:underline"
              >
                {t("drawerViewCart")}
              </Link>

              {paymentSlot && <div className="mt-4 border-t border-border pt-3">{paymentSlot}</div>}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
