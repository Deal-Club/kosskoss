"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useScrollLock } from "@/lib/kk/use-scroll-lock";
import { formatFcfa } from "@/lib/kk/format";
import { cartSubtotalFcfa } from "@/lib/kk/cart-totals";
import { BottleMotif } from "./motifs";
import { CartSuggestions } from "./cart-suggestions";

/**
 * Tiroir du panier.
 *
 * ── Ce qui cassait sur téléphone ──────────────────────────────────────────
 *
 *  1. TROIS BLOCS SE DISPUTAIENT LA HAUTEUR. L'en-tête, les suggestions et le
 *     pied de page étaient tous incompressibles ; seule la liste des articles
 *     pouvait rétrécir. Sur un écran de 667 px, les suggestions et le total
 *     mangeaient 470 px : la liste tombait à quelques dizaines de pixels, et
 *     le bouton « Commander » se retrouvait poussé hors du cadre. Liste et
 *     suggestions ne forment plus qu'UNE SEULE zone de défilement ; l'en-tête
 *     et le pied de page sont explicitement figés (`shrink-0`).
 *
 *  2. LA COLONNE DE TEXTE NE POUVAIT PAS RÉTRÉCIR. `flex-1` sans `min-w-0`
 *     garde la largeur du contenu : la ligne « sélecteur de quantité + prix »
 *     réclame environ 180 px alors qu'il n'en reste 160 sur un écran de
 *     360 px. Le contenu débordait, `overflow-y-auto` basculait l'axe
 *     horizontal en `auto`, et le panier se mettait à glisser latéralement —
 *     le bouton de suppression sortant de l'écran. `min-w-0` rend la colonne
 *     compressible, et la ligne prix/quantité passe à la ligne plutôt que de
 *     déborder.
 *
 *  3. `h-full` MESURAIT LA MAUVAISE HAUTEUR. Sur mobile, un bloc `fixed` se
 *     cale sur la fenêtre barre d'adresse repliée : le pied du tiroir — donc
 *     le bouton d'achat — passait sous l'interface du navigateur. `100dvh`
 *     suit la hauteur réellement visible.
 *
 *  4. LA PAGE DÉFILAIT DERRIÈRE LE TIROIR. Voir `useScrollLock`.
 *
 * Le tiroir est monté dans `<body>` par un portail : il est appelé depuis le
 * layout, mais un portail le met à l'abri de toute pile d'empilement créée par
 * un parent (`transform`, `filter`, `backdrop-filter`) le jour où il serait
 * remonté ailleurs.
 */
export function CartDrawerKK() {
  const { lines, ready, drawerOpen, closeDrawer, setQuantity, remove } = useCart();
  const subtotal = cartSubtotalFcfa(lines);
  const empty = ready && lines.length === 0;

  useScrollLock(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Panier">
      <button
        type="button"
        aria-label="Fermer le panier"
        onClick={closeDrawer}
        className="absolute inset-0 bg-deep/40 backdrop-blur-sm"
      />
      {/* `inset-y-0` + `h-[100dvh]` : le premier ancre le tiroir en haut et en
          bas du cadre, le second borne sa hauteur à la fenêtre réellement
          visible sur mobile. Les deux ensemble, parce qu'`inset-y-0` seul
          retombe sur la fenêtre barre d'adresse repliée. */}
      <aside className="absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-md flex-col bg-background shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="flex items-center gap-2 text-lg text-deep">
            <ShoppingBag className="h-5 w-5 shrink-0" /> Votre panier
          </h2>
          <button
            type="button"
            aria-label="Fermer"
            onClick={closeDrawer}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-deep transition hover:bg-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {empty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
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
            {/* Une seule zone de défilement pour les articles ET les
                suggestions. Elles étaient deux blocs frères qui se disputaient
                la hauteur restante ; elles se suivent maintenant dans le même
                flux, et c'est l'ensemble qui défile.
                `overscroll-contain` empêche le geste de défilement de se
                propager à la page derrière une fois la liste arrivée en bout. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ul className="divide-y divide-border px-4 sm:px-6">
                {lines.map((line) => {
                  const key = `${line.productId}:${line.variantId ?? ""}`;
                  return (
                    <li key={key} className="flex gap-3 py-4 sm:gap-4 sm:py-5">
                      {/* La photo du produit, pas un motif : le client doit
                          reconnaître d'un coup d'œil ce qu'il vient d'ajouter.
                          Le motif ne sert que de repli quand la fiche n'a pas
                          encore d'image. */}
                      <Link
                        href={line.path || "#"}
                        onClick={closeDrawer}
                        className="relative grid h-[4.5rem] w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab] sm:h-20 sm:w-16"
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
                      {/* `min-w-0` : sans lui, cette colonne garde la largeur
                          de son contenu le plus large et pousse la ligne
                          au-delà du cadre du tiroir. */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-deep/70">
                          {line.brand}
                        </p>
                        <Link
                          href={line.path || "#"}
                          onClick={closeDrawer}
                          className="line-clamp-2 text-sm font-medium text-foreground transition hover:text-deep"
                        >
                          {line.name}
                        </Link>
                        {line.variantLabel && (
                          <p className="truncate text-xs font-medium text-deep/70">
                            {line.variantLabel}
                          </p>
                        )}
                        {/* Le prix passe sous le sélecteur plutôt que de
                            déborder quand les deux ne tiennent pas côte à côte
                            — un montant à quatre chiffres sur un écran de
                            320 px. `ms-auto` le maintient à droite dans les
                            deux cas. */}
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-2">
                          <div className="flex shrink-0 items-center rounded-full border border-border">
                            <button
                              type="button"
                              aria-label="Diminuer"
                              onClick={() =>
                                setQuantity(line.productId, line.variantId, line.quantity - 1)
                              }
                              className="grid h-8 w-8 place-items-center rounded-full text-deep hover:bg-sand"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="figure w-7 text-center text-sm">{line.quantity}</span>
                            <button
                              type="button"
                              aria-label="Augmenter"
                              onClick={() =>
                                setQuantity(line.productId, line.variantId, line.quantity + 1)
                              }
                              className="grid h-8 w-8 place-items-center rounded-full text-deep hover:bg-sand"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="figure ms-auto shrink-0 text-sm font-semibold text-deep">
                            {formatFcfa(line.priceCents * line.quantity)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Retirer ${line.name}`}
                        onClick={() => remove(line.productId, line.variantId)}
                        /* Pas de marge négative ici : `-mr-1.5` rentrait la
                           BOÎTE DE MARGE du bouton de 6 px, mais laissait sa
                           boîte de bordure dépasser d'autant du cadre de la
                           ligne — mesuré à 294 px de contenu pour 288 px
                           utiles sur un écran de 320. Le bouton mordait le
                           bord du tiroir. */
                        className="grid h-8 w-8 shrink-0 place-items-center self-start rounded-full text-muted-foreground transition hover:bg-sand hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Les suggestions se placent après les articles : ce que le
                  client a choisi d'abord, ce qu'on lui propose ensuite. Elles
                  défilent avec la liste au lieu de lui voler sa hauteur. */}
              <CartSuggestions />
            </div>

            {/* Le pied de page ne rétrécit jamais : c'est là que se trouve le
                bouton d'achat. Le retrait bas intègre la zone sûre de l'écran
                (barre gestuelle iOS), sans quoi « Commander » se colle au bord
                inférieur et devient difficile à atteindre. */}
            <footer className="shrink-0 border-t border-border px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 sm:px-6 sm:pt-5">
              <div className="flex items-center justify-between gap-3">
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
                  className="flex-1 rounded-full border border-deep px-4 py-3 text-center text-sm font-semibold text-deep transition hover:bg-sand"
                >
                  Voir le panier
                </Link>
                <Link
                  href="/commande"
                  onClick={closeDrawer}
                  className="kk-fill flex-1 rounded-full bg-deep px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Commander
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
