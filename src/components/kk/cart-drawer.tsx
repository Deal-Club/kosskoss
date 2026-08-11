"use client";

import { useEffect } from "react";
import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import { cartSubtotalFcfa } from "@/lib/kk/cart-totals";
import { BottleMotif } from "./motifs";
import { CartSuggestions } from "./cart-suggestions";

export function CartDrawerKK() {
  const { lines, ready, drawerOpen, closeDrawer, setQuantity, remove } = useCart();
  const subtotal = cartSubtotalFcfa(lines);
  const empty = ready && lines.length === 0;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Panier">
      <button
        type="button"
        aria-label="Fermer le panier"
        onClick={closeDrawer}
        className="absolute inset-0 bg-deep/40 backdrop-blur-sm"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg text-deep">
            <ShoppingBag className="h-5 w-5" /> Votre panier
          </h2>
          <button
            type="button"
            aria-label="Fermer"
            onClick={closeDrawer}
            className="grid h-9 w-9 place-items-center rounded-full text-deep transition hover:bg-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <BottleMotif className="h-24 text-deep/30" />
            <p className="text-deep/80">Votre panier est vide.</p>
            <Link
              href="/soins-visage"
              onClick={closeDrawer}
              className="kk-fill rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
              {lines.map((line) => {
                const key = `${line.productId}:${line.variantId ?? ""}`;
                return (
                  <li key={key} className="flex gap-4 py-5">
                    {/* La photo du produit, pas un motif : le client doit
                        reconnaître d'un coup d'œil ce qu'il vient d'ajouter.
                        Le motif ne sert que de repli quand la fiche n'a pas
                        encore d'image. */}
                    <Link
                      href={line.path || "#"}
                      onClick={closeDrawer}
                      className="relative grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]"
                    >
                      {line.image ? (
                        <Image
                          src={line.image}
                          alt={line.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <BottleMotif className="h-3/5 text-deep/70" />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-deep/70">
                        {line.brand}
                      </p>
                      <Link
                        href={line.path || "#"}
                        onClick={closeDrawer}
                        className="text-sm font-medium text-foreground transition hover:text-deep"
                      >
                        {line.name}
                      </Link>
                      {line.variantLabel && (
                        <p className="text-xs font-medium text-deep/70">{line.variantLabel}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-full border border-border">
                          <button
                            type="button"
                            aria-label="Diminuer"
                            onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
                            className="grid h-8 w-8 place-items-center rounded-full text-deep hover:bg-sand"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="figure w-7 text-center text-sm">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Augmenter"
                            onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}
                            className="grid h-8 w-8 place-items-center rounded-full text-deep hover:bg-sand"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="figure text-sm font-semibold text-deep">
                          {formatFcfa(line.priceCents * line.quantity)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Retirer ${line.name}`}
                      onClick={() => remove(line.productId, line.variantId)}
                      className="self-start text-muted-foreground transition hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Les suggestions se placent entre la liste et le total : après ce
                que le client a choisi, avant qu'il ne se décide à payer. Plus
                bas, sous le bouton « Commander », personne ne les verrait. */}
            <CartSuggestions />

            <footer className="border-t border-border px-6 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-deep">Sous-total</span>
                <span className="figure text-lg font-semibold text-deep">{formatFcfa(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Livraison coordonnée via WhatsApp après commande.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/panier"
                  onClick={closeDrawer}
                  className="flex-1 rounded-full border border-deep px-5 py-3 text-center text-sm font-semibold text-deep transition hover:bg-sand"
                >
                  Voir le panier
                </Link>
                <Link
                  href="/commande"
                  onClick={closeDrawer}
                  className="kk-fill flex-1 rounded-full bg-deep px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Commander
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
