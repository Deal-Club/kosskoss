"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

// Galerie de la fiche produit : une grande vue, et les miniatures juste en
// dessous quand le produit a plusieurs visuels. Sans vue complémentaire, le
// rendu est exactement celui d'avant — une seule image, sans rangée vide.
//
// L'ordre vient du back-office : l'image principale d'abord, puis la galerie
// telle qu'elle a été rangée dans le formulaire produit.

export function ProductGallery({
  image,
  images = [],
  alt,
}: {
  image: string;
  images?: string[];
  alt: string;
}) {
  const t = useTranslations("product");

  // L'image principale ouvre la galerie ; les doublons éventuels sont écartés
  // pour ne pas afficher deux fois la même miniature.
  const views = [image, ...images.filter((entry) => entry && entry !== image)];
  const [active, setActive] = useState(0);
  const current = views[active] ?? image;

  return (
    <div>
      {/* Zoom au survol, comme sur les cartes produit. Le grossissement est plus
          léger ici (105 % contre 110 %) : sur une image de cette taille, le même
          rapport déplacerait beaucoup plus de pixels et le geste deviendrait
          brusque. Le cadre garde `overflow-hidden`, l'image ne dépasse jamais.
          Sous `motion-safe`, comme les autres mouvements de la boutique : un
          visiteur qui a demandé moins d'animations n'en reçoit aucune. */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-sm border border-border bg-white">
        <Image
          key={current}
          src={current}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-contain p-6 transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
        />
      </div>

      {views.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("galleryLabel")}>
          {views.map((view, index) => {
            const selected = index === active;
            return (
              <li key={view}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={t("galleryView", { index: index + 1, total: views.length })}
                  aria-current={selected ? "true" : undefined}
                  className={`relative block h-16 w-16 overflow-hidden rounded-sm border bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-20 sm:w-20 ${
                    selected ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Image src={view} alt="" fill sizes="80px" className="object-contain p-1.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
