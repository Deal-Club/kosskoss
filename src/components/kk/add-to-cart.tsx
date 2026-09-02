"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Minus, ShoppingBag, Check, Zap } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import type { KKProductDetail } from "@/server/kk/product";
import { volVersPanier } from "@/lib/kk/fly-to-cart";
import { mesurerEvenement } from "@/lib/kk/mesureNavigateur";
import { identifiantProduitCatalogue } from "@/lib/kk/mesure";
import { FavoriteHeart } from "./product-actions";
import { withLocale } from "./localized-link";

export function AddToCart({ product }: { product: KKProductDetail }) {
  const t = useTranslations("product");
  const { add, openDrawer } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [variantId, setVariantId] = useState<string | undefined>(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const priceFcfa = variant?.priceFcfa ?? product.priceFcfa;
  const oldPriceFcfa = variant?.oldPriceFcfa ?? product.oldPriceFcfa;
  const outOfStock = product.stock <= 0;

  // Identifiant produit ALIGNÉ SUR LE FLUX GOOGLE MERCHANT (voir
  // `identifiantProduitCatalogue`) : le SKU ou l'identifiant de variante n'ont
  // pas d'équivalent dans le catalogue déjà annoncé à Meta/Google, et les
  // utiliser ici cassait l'appariement entre un événement de mesure et
  // l'article correspondant du catalogue.
  const idCatalogue = identifiantProduitCatalogue(product.slug, product.id);

  // `view_item` : une fois par affichage de la fiche, jamais à chaque
  // changement de variante ou de quantité — c'est la CONSULTATION du produit
  // qui est mesurée, pas chacune des interactions qui suivent. Le garde par
  // `useRef` évite un second envoi au double montage du Strict Mode.
  const vueEnvoyee = useRef(false);
  useEffect(() => {
    if (vueEnvoyee.current) return;
    vueEnvoyee.current = true;
    mesurerEvenement({
      type: "view_item",
      reference: idCatalogue,
      articles: [{ reference: idCatalogue, nom: product.name, prixCents: product.priceFcfa, quantite: 1 }],
      totalCents: product.priceFcfa,
    });
  }, [idCatalogue, product.name, product.priceFcfa]);

  /** La ligne de panier décrite par les choix en cours (variante, quantité). */
  function ligneCourante() {
    return {
      productId: product.id,
      variantId: variant?.id,
      variantLabel: variant?.label,
      slug: product.slug,
      brand: product.brand,
      name: product.name,
      image: product.image ?? "",
      path: product.href,
      priceCents: priceFcfa,
      stock: product.stock,
    };
  }

  /**
   * `add_to_cart` : référence = `idCatalogue`, comme `view_item` plus haut —
   * pas la variante choisie. Le flux Merchant ne connaît qu'une offre par
   * produit, jamais par variante ; y faire correspondre la mesure garantit
   * l'appariement catalogue plutôt que de le casser pour gagner un détail que
   * Meta/GA4 ne peuvent de toute façon pas relier à une fiche produit distincte.
   */
  function mesurerAjout() {
    mesurerEvenement({
      type: "add_to_cart",
      reference: idCatalogue,
      articles: [{ reference: idCatalogue, nom: product.name, prixCents: priceFcfa, quantite: qty }],
      totalCents: priceFcfa * qty,
    });
  }

  /**
   * Achat direct : on dépose la ligne au panier et on file au tunnel.
   *
   * Le panier reste le passage obligé — c'est lui qui porte l'état de la
   * commande, et le tunnel le lit. La différence avec l'ajout ordinaire tient
   * à ce qui NE se produit pas : ni vol vers le panier, ni ouverture du
   * tiroir, ni message de confirmation. Trois interruptions qui, sur un achat
   * décidé, ne font que retarder le paiement.
   */
  function handleBuyNow() {
    add(ligneCourante(), qty);
    mesurerAjout();
    router.push(withLocale(pathname, "/commande"));
  }

  async function handleAdd() {
    add(ligneCourante(), qty);
    mesurerAjout();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);

    // Même geste que depuis une vignette. Le vol part de la galerie de la
    // fiche, repérée par son attribut : sur cette page, le bouton n'est pas
    // dans le même bloc que la photo.
    await volVersPanier(document.querySelector<HTMLElement>("[data-visuel-produit]"));
    openDrawer();
  }

  return (
    <div>
      {/* Prix (suit la variante sélectionnée) */}
      <div className="flex items-baseline gap-3">
        <span className="figure text-2xl font-semibold text-deep">{formatFcfa(priceFcfa)}</span>
        {oldPriceFcfa && (
          <span className="figure text-base text-muted-foreground line-through">
            {formatFcfa(oldPriceFcfa)}
          </span>
        )}
      </div>

      {/* TOTAL, dès que la quantité dépasse un.

          Le grand prix reste le prix UNITAIRE : c'est lui qui se compare d'une
          fiche à l'autre, et le multiplier en place ferait croire à un produit
          plus cher. Le total s'ajoute donc en dessous, avec le détail du calcul
          — on voit à la fois ce qu'on paie et pourquoi.
          Il ne s'affiche pas à l'unité : « Total : 20 500 FCFA » sous
          « 20 500 FCFA » n'apprend rien et alourdit le bloc d'achat. */}
      {qty > 1 && (
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {t("totalLabel")}{" "}
          <span className="figure text-base font-semibold text-deep">
            {formatFcfa(priceFcfa * qty)}
          </span>{" "}
          <span className="figure">
            ({qty} × {formatFcfa(priceFcfa)})
          </span>
        </p>
      )}

      {/* Sélecteur de variante (contenance) — seulement s'il y a un VRAI choix
          à faire. `> 1` et non `> 0` : sur les 71 produits actuels, aucun ne
          porte plus d'une contenance active (voir la contenance déjà lisible
          dans le titre — `formatProductTitle`), donc le sélecteur ne servait
          qu'à répéter cette même information sous forme de bouton non
          cliquable-utilement. Le jour où un produit porte deux volumes, il
          réapparaît de lui-même — rien à changer ici. */}
      {product.variants.length > 1 && (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("contentLabel")}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const active = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-deep bg-deep text-primary-foreground"
                      : "border-border bg-cream text-deep hover:border-deep/50"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ACHAT DIRECT EN PREMIER, et seul sur sa ligne.

          C'est le geste que la fiche doit servir : sur une boutique où le
          paiement se fait par Mobile Money en quelques secondes, envoyer tout
          le monde par le panier ajoute une étape à une décision déjà prise.
          « Ajouter au panier » reste juste en dessous, pour qui compose une
          commande de plusieurs produits — les deux publics sont réels, l'ordre
          dit lequel est le plus courant.

          BLEU PROFOND, la couleur primaire de la charte : l'action principale
          porte la couleur de la marque, pas une teinte tierce. Il s'est
          essayé en laiton d'encre pour se distinguer de l'ajout au panier —
          une couleur hors charte qui faisait tache. La hiérarchie se joue
          maintenant sur le poids, pas sur une couleur inventée : l'achat est
          plein, l'ajout est au contour, tous deux dans le même bleu. Le blanc
          sur bleu profond tient largement le contraste (≈ 11:1). */}
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={outOfStock}
        className="kk-fill group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-deep px-7 py-4 text-base font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap className="h-4 w-4 shrink-0" />
        {outOfStock ? t("unavailable") : t("payNow")}
      </button>

      {/* Quantité + ajout */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-border bg-cream">
          <button
            type="button"
            aria-label={t("decreaseQuantityShort")}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-11 w-11 place-items-center rounded-full text-deep transition hover:bg-sand disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="figure w-8 text-center text-sm font-semibold text-deep" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label={t("increaseQuantityShort")}
            onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
            className="grid h-11 w-11 place-items-center rounded-full text-deep transition hover:bg-sand"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Sur mobile, l'icône seule.
            « Ajouter au panier » ne tenait pas sur la largeur restante à côté
            du sélecteur de quantité et du cœur : le texte se cassait sur trois
            lignes et le bouton devenait un disque démesuré. Le libellé revient
            dès qu'il y a la place, et `aria-label` le porte en permanence pour
            les lecteurs d'écran.
            « Indisponible » reste écrit à toutes les tailles : un bouton grisé
            sans un mot n'explique pas pourquoi il ne répond pas. */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          aria-label={outOfStock ? t("unavailableAria") : t("addToCart")}
          className="kk-fill kk-fill-deep group inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-deep bg-transparent px-6 py-3.5 text-sm font-semibold text-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 sm:px-7"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          {outOfStock ? t("unavailable") : <span className="hidden sm:inline">{t("addToCart")}</span>}
        </button>

        <FavoriteHeart
          size="round"
          product={{
            id: product.id,
            slug: product.slug,
            brand: product.brand,
            name: product.name,
            priceFcfa: product.priceFcfa,
            oldPriceFcfa: product.oldPriceFcfa,
            image: product.image,
            href: product.href,
            stock: product.stock,
            hasVariants: product.variants.length > 0,
          }}
        />
      </div>

      {/* Confirmation accessible */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-3 flex items-center gap-2 text-sm text-deep transition ${
          added ? "opacity-100" : "opacity-0"
        }`}
      >
        {added && (
          <>
            <Check className="h-4 w-4" /> {t("addedToCart")}{" "}
            <button type="button" onClick={openDrawer} className="underline underline-offset-2">
              {t("viewCartLink")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Rappel bas de fiche : achat direct, pas un simple ancrage vers le bloc
 * d'achat plus haut. Retour client — remonter l'utilisateur pour qu'il
 * reclique « Payer maintenant » retardait un achat déjà décidé.
 *
 * Achète la VARIANTE DE RÉFÉRENCE (`product.variants[0]`, qté 1) — même
 * présélection que celle d'`AddToCart` au premier rendu (voir `variantId`
 * plus haut) : si le client a changé de contenance dans le bloc d'achat,
 * cette instance-ci ne le sait pas, elle repart de la même valeur par défaut.
 * Ce n'est PAS un second `AddToCart` monté sur la page : `view_item` ne se
 * mesure qu'à l'ouverture de la fiche (voir le `useEffect` plus haut), et un
 * second montage l'aurait renvoyé une deuxième fois. Ce bouton ne mesure
 * `add_to_cart` qu'à son propre clic — aucun doublon possible.
 */
export function BuyNowReminder({ product }: { product: KKProductDetail }) {
  const t = useTranslations("product");
  const { add } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const referenceVariant = product.variants[0];
  const priceFcfa = referenceVariant?.priceFcfa ?? product.priceFcfa;
  const outOfStock = product.stock <= 0;

  function handleClick() {
    add(
      {
        productId: product.id,
        variantId: referenceVariant?.id,
        variantLabel: referenceVariant?.label,
        slug: product.slug,
        brand: product.brand,
        name: product.name,
        image: product.image ?? "",
        path: product.href,
        priceCents: priceFcfa,
        stock: product.stock,
      },
      1,
    );
    const idCatalogue = identifiantProduitCatalogue(product.slug, product.id);
    mesurerEvenement({
      type: "add_to_cart",
      reference: idCatalogue,
      articles: [{ reference: idCatalogue, nom: product.name, prixCents: priceFcfa, quantite: 1 }],
      totalCents: priceFcfa,
    });
    router.push(withLocale(pathname, "/commande"));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      aria-label={t("reminderAria", { name: product.name })}
      className="kk-fill group flex w-full items-center justify-between gap-4 rounded-full bg-deep px-6 py-4 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-sm font-semibold">{product.name}</span>
      <span className="figure flex shrink-0 items-center gap-2 text-sm font-semibold">
        {outOfStock ? t("unavailable") : formatFcfa(priceFcfa)}
        <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
      </span>
    </button>
  );
}
