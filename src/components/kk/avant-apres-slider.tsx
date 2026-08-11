"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ChevronsLeftRight } from "lucide-react";

/**
 * Comparateur à curseur : deux photos superposées, une poignée qui découvre
 * l'une sous l'autre.
 *
 * ── Comment la révélation fonctionne ──────────────────────────────────────
 * Les deux images occupent exactement la même surface. Celle du dessus est
 * rognée par `clip-path: inset()` selon la position du curseur — on ne
 * redimensionne rien, donc les deux visages restent parfaitement superposés
 * quelle que soit la position. Une largeur animée décalerait l'image et
 * ferait glisser le visage sous la ligne.
 *
 * ── Pourquoi un `input range` invisible ───────────────────────────────────
 * Le curseur est un vrai champ de formulaire, rendu transparent et étiré sur
 * toute la surface. On hérite gratuitement du clavier (flèches, Origine/Fin),
 * du tactile, du glisser à la souris et de l'annonce aux lecteurs d'écran —
 * là où un `onPointerMove` maison redemanderait tout ce travail et le ferait
 * moins bien.
 *
 * ── Sur l'honnêteté des images ────────────────────────────────────────────
 * Ce composant n'affiche que ce qu'on lui donne. La responsabilité de ce que
 * montrent les deux photos — et de la mention qui les accompagne — appartient
 * à la section qui l'emploie : un avant/après est la preuve la plus forte
 * qu'une boutique de soin puisse produire, et la plus destructrice quand elle
 * est fabriquée.
 */
export function AvantApresSlider({
  avant,
  apres,
  altAvant,
  altApres,
  legendeAvant = "Avant",
  legendeApres = "Après",
}: {
  avant: string;
  apres: string;
  altAvant: string;
  altApres: string;
  legendeAvant?: string;
  legendeApres?: string;
}) {
  const [position, setPosition] = useState(50);
  const cadre = useRef<HTMLDivElement>(null);

  const surGlissement = useCallback((valeur: number) => {
    setPosition(valeur);
  }, []);

  return (
    <div
      ref={cadre}
      className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl bg-sand"
    >
      {/* Dessous : l'état final. Il occupe tout le cadre. */}
      <Image
        src={apres}
        alt={altApres}
        fill
        sizes="(max-width: 1024px) 100vw, 45vw"
        className="object-cover"
        priority
      />

      {/* Dessus : l'état initial, rogné à droite selon le curseur. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={avant}
          alt={altAvant}
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Étiquettes. Chacune s'efface quand le curseur passe sur elle, sinon
          elle resterait posée sur l'image qu'elle ne décrit plus. */}
      <span
        className="pointer-events-none absolute left-4 top-4 rounded-full bg-deep/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: position > 18 ? 1 : 0 }}
      >
        {legendeAvant}
      </span>
      <span
        className="pointer-events-none absolute right-4 top-4 rounded-full bg-cream/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-deep backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: position < 82 ? 1 : 0 }}
      >
        {legendeApres}
      </span>

      {/* Ligne de séparation et poignée. Purement décoratives : c'est le champ
          ci-dessous qui porte l'interaction. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-cream shadow-[0_0_12px_rgba(0,0,0,0.35)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <span className="absolute top-1/2 left-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream text-deep shadow-lg">
          <ChevronsLeftRight className="h-5 w-5" />
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={position}
        onChange={(e) => surGlissement(Number(e.target.value))}
        aria-label="Comparer avant et après — déplacez pour révéler"
        aria-valuetext={`${Math.round(position)} % de l'image « ${legendeAvant} » visible`}
        className="kk-curseur absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
