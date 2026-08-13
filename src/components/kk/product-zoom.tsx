"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ZoomIn } from "lucide-react";

/**
 * Visuel principal de la fiche produit, avec zoom au survol.
 *
 * ── Le geste ──────────────────────────────────────────────────────────────
 * Le pointeur entre dans le cadre, l'image grossit ; il se déplace, la zone
 * grossie suit. C'est la loupe qu'on trouve sur la plupart des boutiques, et
 * elle sert ici quelque chose de précis : lire la contenance, la liste INCI ou
 * la mention d'origine imprimée sur un flacon photographié à 1024 px. Sur un
 * marché où la contrefaçon est le premier frein d'achat, pouvoir approcher
 * l'étiquette n'est pas un ornement.
 *
 * ── Comment le suivi est fait ─────────────────────────────────────────────
 * `transform-origin` piloté par deux variables CSS écrites DIRECTEMENT sur le
 * nœud, sans passer par un état React. Un `setState` à chaque `mousemove`
 * relancerait un rendu à chaque pixel parcouru : la loupe deviendrait
 * saccadée précisément quand on la déplace lentement pour lire quelque chose.
 * Seul le fait d'être survolé ou non passe par un état — il change deux fois
 * par visite, pas soixante fois par seconde.
 *
 * ── Ce qui est laissé de côté ─────────────────────────────────────────────
 * Aucun comportement tactile : sans pointeur, il n'y a pas de survol, et un
 * zoom déclenché au doigt entrerait en conflit avec le défilement de la page.
 * Sur mobile, le pincement du navigateur fait déjà le travail.
 */

/** Grossissement. Au-delà de 2,5×, un JPEG de 1024 px montre ses pixels. */
const FACTEUR = 2.2;

export function ProductZoom({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [survole, setSurvole] = useState(false);

  function suivrePointeur(e: React.MouseEvent<HTMLDivElement>) {
    const el = cadre.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Position du pointeur en pourcentage du cadre : c'est ce point qui reste
    // immobile pendant l'agrandissement, donc celui qu'on regarde.
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--zoom-x", `${x}%`);
    el.style.setProperty("--zoom-y", `${y}%`);
  }

  return (
    <div
      ref={cadre}
      // Point de départ du vol vers le panier (lib/kk/fly-to-cart) : c'est ce
      // cadre que l'animation d'ajout fait décoller. L'attribut appartient donc
      // au visuel lui-même et voyage avec lui.
      data-visuel-produit
      onMouseEnter={() => setSurvole(true)}
      onMouseLeave={() => setSurvole(false)}
      onMouseMove={suivrePointeur}
      className={`relative cursor-zoom-in overflow-hidden ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width:1024px) 100vw, 45vw"
        className="object-contain p-2 transition-transform duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none"
        style={{
          transformOrigin: "var(--zoom-x, 50%) var(--zoom-y, 50%)",
          transform: survole ? `scale(${FACTEUR})` : "scale(1)",
        }}
      />

      {/* Repère d'affordance : rien n'indique qu'une image est agrandissable.
          Il s'efface pendant le survol, où il n'a plus rien à annoncer et
          masquerait une partie de ce qu'on est venu regarder. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-deep shadow-sm backdrop-blur-sm transition-opacity duration-200 ${
          survole ? "opacity-0" : "opacity-100"
        }`}
      >
        <ZoomIn className="h-4 w-4" />
      </span>
    </div>
  );
}
