"use client";

import Image from "next/image";
import { ImageIcon, ImageOff } from "lucide-react";
import { useState } from "react";

interface PreviewImageProps {
  src: string;
  alt: string;
  /** Classes du cadre : dimensions, arrondi, fond. La position relative est ajoutée ici. */
  wrapperClassName?: string;
  /** Classes de l'image elle-même, en pratique object-cover ou object-contain. */
  imageClassName?: string;
  sizes?: string;
  /** Texte affiché tant qu'aucune image n'est renseignée. */
  emptyLabel?: string;
  /**
   * Cadres réduits, une vignette de liste par exemple : l'état vide ou en échec
   * se réduit à une icône, le texte n'y tiendrait pas.
   */
  compact?: boolean;
}

/**
 * Deux formes de valeur sont acceptées : un chemin interne (« /uploads/… ») ou une
 * URL absolue, typiquement Cloudinary. next/image refuse tout le reste, on filtre
 * donc avant de tenter l'affichage.
 */
function isDisplayableSource(value: string): boolean {
  if (value.startsWith("/")) return true;
  return /^https?:\/\//i.test(value);
}

/**
 * Image d'aperçu du back-office. Elle ne casse jamais la mise en page : source
 * absente ou chargement en échec, un texte de remplacement occupe le cadre.
 *
 * Le rendu est « unoptimized » à dessein : pendant la saisie, l'adresse change à
 * chaque frappe et peut pointer vers un hôte absent de next.config.ts, ce qui
 * ferait échouer l'optimiseur.
 */
export function PreviewImage({
  src,
  alt,
  wrapperClassName = "",
  imageClassName = "object-cover",
  sizes = "380px",
  emptyLabel = "Aucune image",
  compact = false,
}: PreviewImageProps) {
  // On mémorise la source fautive plutôt qu'un booléen : l'aperçu se réinitialise
  // ainsi de lui-même dès que la valeur change, sans useEffect.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  const trimmed = src.trim();
  const displayable = trimmed.length > 0 && isDisplayableSource(trimmed) && brokenSrc !== trimmed;

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {displayable ? (
        <Image
          key={trimmed}
          src={trimmed}
          alt={alt}
          fill
          sizes={sizes}
          className={imageClassName}
          onError={() => setBrokenSrc(trimmed)}
          unoptimized
        />
      ) : compact ? (
        <span
          className="flex h-full w-full items-center justify-center text-muted-foreground"
          title={trimmed ? "Aperçu indisponible" : emptyLabel}
        >
          {trimmed ? <ImageOff className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        </span>
      ) : (
        <span className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
          {trimmed ? "Aperçu indisponible" : emptyLabel}
        </span>
      )}
    </div>
  );
}
