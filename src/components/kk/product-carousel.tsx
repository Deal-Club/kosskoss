"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KKProductView } from "@/types/kk";
import { ProductCard } from "./product-card";

/**
 * Rail de produits qui défile en continu, avec flèches.
 *
 * ── Pourquoi un défilement et pas une grille ──────────────────────────────
 * Ce bloc vit dans une colonne étroite, à droite des catégories : une grille
 * y tenait quatre produits et s'arrêtait là. Le défilement en montre autant
 * qu'on veut sans allonger la page.
 *
 * ── Comment l'infini est obtenu ───────────────────────────────────────────
 * La liste est rendue DEUX FOIS. Quand le défilement atteint la moitié de la
 * piste, on retranche cette moitié à `scrollLeft` : les produits affichés à
 * cet instant sont exactement les mêmes, donc le saut est invisible. C'est ce
 * qui évite le retour en arrière brutal d'un carrousel qui rembobine.
 *
 * ── Pourquoi une animation image par image plutôt qu'un minuteur ──────────
 * `requestAnimationFrame` avance de quelques dixièmes de pixel à chaque image,
 * ce qui donne un glissement continu. Un `setInterval` qui pousserait d'une
 * carte toutes les trois secondes produirait des à-coups, et se désynchronise
 * dès que l'onglet passe en arrière-plan.
 *
 * ── Ce qui met le défilement en pause ─────────────────────────────────────
 * Le survol, le focus clavier, un doigt posé sur l'écran, et l'onglet caché.
 * Un rail qui continue de bouger pendant qu'on vise une carte est un piège :
 * la cible se dérobe au moment du clic.
 *
 * `prefers-reduced-motion` coupe l'automatisme entièrement — les flèches, elles,
 * restent disponibles. Le mouvement devient alors un choix, jamais une
 * imposition.
 */

/** Vitesse du glissement, en pixels par seconde. Lent, volontairement. */
const VITESSE = 22;

export function ProductCarousel({
  products,
  label,
}: {
  products: KKProductView[];
  /** Décrit la liste aux lecteurs d'écran et nomme les flèches. */
  label: string;
}) {
  const piste = useRef<HTMLDivElement>(null);
  const enPause = useRef(false);
  const [flechesUtiles, setFlechesUtiles] = useState(false);

  // La liste doublée : c'est elle qui rend la boucle possible.
  const doublee = [...products, ...products];

  /** Largeur d'une carte plus sa gouttière, pour un pas de flèche cohérent. */
  const pas = useCallback(() => {
    const el = piste.current;
    if (!el) return 280;
    const carte = el.querySelector<HTMLElement>("[data-carte]");
    return carte ? carte.offsetWidth + 20 : 280;
  }, []);

  const reprise = useRef<number>(0);

  /**
   * Défilement d'une carte, par les flèches.
   *
   * Le glissement automatique doit être suspendu pendant l'opération : il
   * écrit `scrollLeft` à chaque image, et écraserait donc le défilement doux
   * dès la frame suivante — c'est ce qui rendait les flèches inopérantes.
   * On rend la main une fois l'animation terminée.
   */
  const avancer = useCallback(
    (sens: 1 | -1) => {
      const el = piste.current;
      if (!el) return;
      enPause.current = true;
      window.clearTimeout(reprise.current);
      el.scrollBy({ left: sens * pas(), behavior: "smooth" });
      reprise.current = window.setTimeout(() => {
        enPause.current = false;
      }, 700);
    },
    [pas],
  );

  // Les flèches ne servent que s'il y a de quoi défiler.
  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    const mesurer = () => setFlechesUtiles(el.scrollWidth > el.clientWidth + 8);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [products.length]);

  // Le glissement continu.
  useEffect(() => {
    const el = piste.current;
    if (!el) return;

    const doux = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (doux.matches) return;

    let frame = 0;
    let precedent = 0;

    const avance = (temps: number) => {
      frame = requestAnimationFrame(avance);
      if (!precedent) precedent = temps;
      const delta = temps - precedent;
      precedent = temps;

      if (enPause.current || document.hidden) return;

      const moitie = el.scrollWidth / 2;
      if (moitie <= 0) return;

      el.scrollLeft += (VITESSE * delta) / 1000;
      // Raccord invisible : on revient d'une demi-piste, sur des produits
      // identiques à ceux qu'on vient de dépasser.
      if (el.scrollLeft >= moitie) el.scrollLeft -= moitie;
    };

    frame = requestAnimationFrame(avance);
    return () => cancelAnimationFrame(frame);
  }, [products.length]);

  if (products.length === 0) return null;

  const pause = () => {
    window.clearTimeout(reprise.current);
    enPause.current = true;
  };
  const relancer = () => {
    enPause.current = false;
  };

  return (
    // Les gestionnaires de pause sont ici et non sur la piste : les flèches
    // débordent du rail, et les survoler laissait le glissement continuer sous
    // le pointeur — la carte visée se dérobait au moment du clic.
    <div
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={relancer}
      onFocusCapture={pause}
      onBlurCapture={relancer}
      onTouchStart={pause}
      onTouchEnd={relancer}
    >
      <div
        ref={piste}
        role="region"
        aria-label={label}
        tabIndex={0}
        /* Les marges négatives annulent le padding de la carte qui porte ce
           rail, et le padding les rétablit à l'intérieur de la piste : les
           cartes courent alors jusqu'au bord du cadre au lieu de s'arrêter à
           deux centimètres. Sur un téléphone, c'est ce qui fait comprendre
           qu'il y a une suite — une carte coupée par une marge se lit comme
           une carte mal placée, coupée par le bord elle se lit comme un rail.
           Les valeurs suivent celles du cadre : p-5 sur mobile, p-6 au-delà. */
        className="kk-piste -mx-5 flex gap-5 overflow-x-auto px-5 pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep sm:-mx-6 sm:px-6"
      >
        {doublee.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            data-carte
            // Le second exemplaire ne doit pas être annoncé deux fois.
            aria-hidden={i >= products.length}
            className="w-[min(60vw,15rem)] shrink-0"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {flechesUtiles && (
        <>
          <Fleche sens="gauche" label={`${label} — précédent`} onClick={() => avancer(-1)} />
          <Fleche sens="droite" label={`${label} — suivant`} onClick={() => avancer(1)} />
        </>
      )}
    </div>
  );
}

/** Flèche posée sur le bord du rail, à cheval sur les cartes. */
function Fleche({
  sens,
  label,
  onClick,
}: {
  sens: "gauche" | "droite";
  label: string;
  onClick: () => void;
}) {
  const Icone = sens === "gauche" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-[38%] hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/95 text-deep shadow-lg backdrop-blur-sm transition hover:border-deep/40 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep sm:grid ${
        sens === "gauche" ? "-left-4" : "-right-4"
      }`}
    >
      <Icone className="h-5 w-5" />
    </button>
  );
}
