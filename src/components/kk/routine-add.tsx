"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import type { KKRoutineView } from "@/types/kk";

/**
 * Ajout d'une routine entière au panier, en un geste.
 *
 * C'est le mécanisme de conversion demandé par le client — « le site doit être
 * orienté conversion et donc ne pas multiplier les étapes si elles ne sont pas
 * nécessaires » — et repris de sa maquette, où chaque carte de routine porte
 * son propre « Ajouter au panier ». Aucune page intermédiaire, aucune
 * configuration : la routine est composée, elle part au panier telle quelle.
 *
 * Seul ce bouton traverse la frontière client : les cartes de routine
 * elles-mêmes restent des composants serveur.
 *
 * Le tiroir ne s'ouvre pas tout seul depuis l'accueil. Sur une rangée de cinq
 * routines, le visiteur compare — lui couper la vue au premier ajout le forcerait
 * à refermer pour continuer. La confirmation se lit sur le bouton, et la pastille
 * du panier fait le reste.
 */
export function RoutineAddToCart({
  routine,
  variant = "solid",
  className = "",
}: {
  routine: KKRoutineView;
  /** `solid` sur fond clair (carte), `light` sur fond sombre. */
  variant?: "solid" | "light";
  className?: string;
}) {
  const { add } = useCart();
  const [ajoutee, setAjoutee] = useState(false);

  // Une routine dont les produits n'ont ni slug ni chemin ne peut pas produire
  // de ligne de panier valable : le serveur la refuserait à la commande.
  const utilisable = routine.steps.every((s) => s.product.slug && s.product.href);

  function ajouter() {
    if (!utilisable) return;
    for (const step of routine.steps) {
      const p = step.product;
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
      );
    }
    setAjoutee(true);
    window.setTimeout(() => setAjoutee(false), 2200);
  }

  const base =
    variant === "light"
      ? "kk-fill kk-fill-deep bg-sand text-deep"
      : "kk-fill bg-deep text-primary-foreground";

  return (
    <button
      type="button"
      onClick={ajouter}
      disabled={!utilisable}
      // Le libellé annonce le nombre de produits : « Ajouter au panier » seul,
      // sur une routine, laisse croire à un article unique.
      aria-label={`Ajouter la ${routine.name} au panier — ${routine.steps.length} produits`}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${base} ${className}`}
    >
      {ajoutee ? (
        <>
          <Check className="h-4 w-4" />
          Routine ajoutée
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" />
          Ajouter la routine
        </>
      )}
    </button>
  );
}
