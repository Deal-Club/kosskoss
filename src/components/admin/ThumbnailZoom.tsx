"use client";

import { useState, type MouseEvent } from "react";
import { PreviewImage } from "@/components/admin/PreviewImage";

/** Côté de l'agrandissement, en pixels. */
const ZOOM_SIZE = 240;
/** Marge minimale conservée avec les bords de la fenêtre. */
const VIEWPORT_MARGIN = 8;

interface ThumbnailZoomProps {
  src: string;
  alt: string;
}

/**
 * Vignette de liste qui s'agrandit au survol.
 *
 * L'agrandissement est positionné en « fixed » plutôt qu'en absolu : le tableau
 * des produits défile horizontalement, un panneau positionné dans son flux
 * serait rogné par ce défilement.
 */
export function ThumbnailZoom({ src, alt }: ThumbnailZoomProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trimmed = src.trim();

  function handleEnter(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    // Ouverture à droite de la vignette, centrée sur elle, puis ramenée dans la
    // fenêtre pour que les premières et dernières lignes restent lisibles.
    const centered = rect.top + rect.height / 2 - ZOOM_SIZE / 2;
    const maxTop = window.innerHeight - ZOOM_SIZE - VIEWPORT_MARGIN;
    const top = Math.min(Math.max(VIEWPORT_MARGIN, centered), Math.max(VIEWPORT_MARGIN, maxTop));

    // À droite s'il y a la place, à gauche sinon.
    const spaceOnRight = window.innerWidth - rect.right;
    const left =
      spaceOnRight > ZOOM_SIZE + 24 ? rect.right + 12 : rect.left - ZOOM_SIZE - 12;

    setPosition({ top, left });
  }

  return (
    <div
      className="w-fit"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPosition(null)}
    >
      <PreviewImage
        src={src}
        alt={alt}
        wrapperClassName="h-12 w-12 rounded-sm border border-border bg-muted transition-colors hover:border-primary"
        imageClassName="object-contain p-1"
        sizes="48px"
        compact
      />

      {position && trimmed && (
        // Les coordonnées sont calculées au survol : seul cas où le style inline
        // est inévitable, tout le reste passe par les classes utilitaires.
        <div
          className="pointer-events-none fixed z-50 rounded-sm border border-border bg-white p-2 shadow-xl"
          style={{ top: position.top, left: position.left, width: ZOOM_SIZE, height: ZOOM_SIZE }}
        >
          <PreviewImage
            src={src}
            alt={alt}
            wrapperClassName="h-full w-full"
            imageClassName="object-contain"
            sizes="240px"
          />
        </div>
      )}
    </div>
  );
}
