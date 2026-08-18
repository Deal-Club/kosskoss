"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag, Check, Zap } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { withLocale } from "./localized-link";
import type { KKRoutineView } from "@/types/kk";

/**
 * Achat d'une routine entière en un geste.
 *
 * C'est le mécanisme de conversion demandé par le client — « le site doit être
 * orienté conversion et donc ne pas multiplier les étapes si elles ne sont pas
 * nécessaires » — et repris de sa maquette, où chaque carte de routine porte
 * son propre bouton d'achat. Aucune configuration : la routine est composée,
 * elle part telle quelle.
 *
 * DEUX RÉGIMES, PARCE QUE LES DEUX PLACES N'ONT PAS LE MÊME PUBLIC :
 *
 *   — `mode="achat"` (les vignettes des rangées de routines) mène DIRECTEMENT
 *     au tunnel. Sur une vignette, la routine se choisit d'un coup d'œil ; y
 *     déposer un article puis laisser le visiteur chercher son panier ajoute
 *     deux gestes à une décision déjà prise. Le panier reste le passage obligé
 *     — c'est lui qui porte l'état de la commande, et le tunnel le lit — mais
 *     il est traversé, pas exposé. Même dispositif que « Payer maintenant » sur
 *     une fiche produit (`add-to-cart.tsx`).
 *
 *   — `mode="panier"` (la page de la routine) dépose et reste sur place. On y
 *     arrive pour lire le détail des gestes ; couper cette lecture par un saut
 *     au paiement priverait de la seule page qui explique ce qu'on achète.
 *
 * Seul ce bouton traverse la frontière client : les cartes de routine
 * elles-mêmes restent des composants serveur.
 *
 * En mode panier, le tiroir ne s'ouvre pas tout seul : sur une rangée de
 * routines, le visiteur compare — lui couper la vue au premier ajout le
 * forcerait à refermer pour continuer. La confirmation se lit sur le bouton, et
 * la pastille du panier fait le reste.
 */
export function RoutineAddToCart({
  routine,
  variant = "solid",
  mode = "panier",
  className = "",
}: {
  routine: KKRoutineView;
  /** `solid` sur fond clair (carte), `light` sur fond sombre. */
  variant?: "solid" | "light";
  /** `achat` file au tunnel de commande ; `panier` dépose et reste sur place. */
  mode?: "panier" | "achat";
  className?: string;
}) {
  const { add } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [ajoutee, setAjoutee] = useState(false);

  // Une routine dont les produits n'ont ni slug ni chemin ne peut pas produire
  // de ligne de panier valable : le serveur la refuserait à la commande.
  const utilisable = routine.steps.every((s) => s.product.slug && s.product.href);
  const achatDirect = mode === "achat";

  function deposer() {
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
  }

  function agir() {
    if (!utilisable) return;
    deposer();

    if (achatDirect) {
      // Ni confirmation ni tiroir : sur un achat décidé, ce sont deux
      // interruptions qui ne font que retarder le paiement.
      router.push(withLocale(pathname, "/commande"));
      return;
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
      onClick={agir}
      disabled={!utilisable}
      // Le libellé annonce le nombre de produits : sur une routine, un intitulé
      // seul laisse croire à un article unique.
      aria-label={
        achatDirect
          ? `Acheter la ${routine.name} — ${routine.steps.length} produits`
          : `Ajouter la ${routine.name} au panier — ${routine.steps.length} produits`
      }
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${base} ${className}`}
    >
      {achatDirect ? (
        <>
          <Zap className="h-4 w-4 shrink-0" />
          Acheter maintenant
        </>
      ) : ajoutee ? (
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
