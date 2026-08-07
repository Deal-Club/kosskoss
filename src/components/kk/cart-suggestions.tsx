"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { LocalizedLink as Link } from "./localized-link";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import { BottleMotif } from "./motifs";
import type { KKProductView } from "@/types/kk";

/**
 * « Vous aimeriez aussi » — suggestions au pied du tiroir.
 *
 * Chargées à l'ouverture, à partir de ce que contient le panier : voir
 * `getCartSuggestions`. Elles sont relues à chaque ouverture parce que le
 * panier a pu changer entre-temps, et qu'une suggestion portant sur un produit
 * qu'on vient d'ajouter n'a plus de sens.
 *
 * Le bloc disparaît entièrement s'il n'y a rien à proposer — un titre
 * « Vous aimeriez aussi » suivi du vide vaut moins que rien.
 */
export function CartSuggestions() {
  const { lines, add } = useCart();
  const [items, setItems] = useState<KKProductView[]>([]);
  const [chargement, setChargement] = useState(true);

  // Les identifiants sont sérialisés pour servir de dépendance stable : le
  // tableau `lines` change de référence à chaque rendu, la chaîne non.
  const idsPanier = lines.map((l) => l.productId).join(",");

  useEffect(() => {
    let annule = false;
    setChargement(true);

    void (async () => {
      try {
        const res = await fetch("/api/kk/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: idsPanier ? idsPanier.split(",") : [] }),
        });
        if (!res.ok || annule) return;
        const data = (await res.json()) as { items?: KKProductView[] };
        if (!annule) setItems(data.items ?? []);
      } catch {
        // Hors ligne : le tiroir garde son panier, seule la suggestion manque.
      } finally {
        if (!annule) setChargement(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [idsPanier]);

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="sr-only">Chargement des suggestions…</span>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border px-6 py-5">
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Vous aimeriez aussi
      </h3>

      <ul className="mt-3 space-y-3">
        {items.map((p) => {
          const decline = p.hasVariants === true;
          return (
            <li key={p.id} className="flex items-center gap-3">
              <Link
                href={p.href ?? "#"}
                className="relative grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]"
              >
                {p.image ? (
                  <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />
                ) : (
                  <BottleMotif className="h-3/5 text-deep/70" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {p.brand}
                </p>
                <Link
                  href={p.href ?? "#"}
                  className="block truncate text-sm text-foreground transition hover:text-deep"
                >
                  {p.name}
                </Link>
                <span className="figure text-xs font-semibold text-deep">
                  {formatFcfa(p.priceFcfa)}
                </span>
              </div>

              {/* Un produit décliné en contenances renvoie à sa fiche : le prix
                  affiché ici est celui de base, choisir une variante à la place
                  du client lui facturerait un montant qu'il n'a pas vu. */}
              {decline ? (
                <Link
                  href={p.href ?? "#"}
                  aria-label={`Choisir une contenance pour ${p.name}`}
                  title="Choisir une contenance"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-deep transition hover:border-deep/50 hover:bg-sand"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    add(
                      {
                        productId: p.id,
                        slug: p.slug ?? "",
                        brand: p.brand,
                        name: p.name,
                        image: p.image ?? "",
                        path: p.href ?? "",
                        priceCents: p.priceFcfa,
                        stock: p.stock ?? 0,
                      },
                      1,
                    )
                  }
                  aria-label={`Ajouter ${p.name} au panier`}
                  title="Ajouter au panier"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-deep text-primary-foreground transition hover:bg-deep/90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
