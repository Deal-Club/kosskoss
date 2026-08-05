"use client";

import { ChevronRight } from "lucide-react";
import { PreviewImage } from "@/components/admin/PreviewImage";
import type { CategoryGuideSection } from "@/server/types";

interface CategoryPreviewProps {
  groupSlug: string;
  groupLabel: string;
  label: string;
  description: string;
  image: string;
  intro: string;
  closing: string;
  sections: CategoryGuideSection[];
}

/** Marque le contenu manquant sans laisser de trou dans la mise en page. */
function Placeholder({ children }: { children: string }) {
  return <span className="text-muted-foreground/60 italic">{children}</span>;
}

/**
 * Reproduction de la page catégorie telle que la voit le client, alimentée par
 * l'état du formulaire. Les composants de la boutique ne sont pas réutilisés :
 * ils dépendent de next-intl et du routage localisé, absents du back-office. Les
 * libellés figés sont donc repris en français depuis src/messages/fr.json.
 */
export function CategoryPreview({
  groupSlug,
  groupLabel,
  label,
  description,
  image,
  intro,
  closing,
  sections,
}: CategoryPreviewProps) {
  const displayLabel = label.trim();
  const filledSections = sections.filter(
    (section) => section.heading.trim() || section.body.trim(),
  );

  return (
    <div className="bg-white text-[13px]">
      {/* Fil d'ariane, comme en haut de la page catégorie */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span>Accueil</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate">{groupLabel || groupSlug || "Univers"}</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate font-semibold text-foreground">
          {displayLabel || "Catégorie"}
        </span>
      </div>

      <div className="px-3 py-4">
        <div className="mb-4 flex items-center gap-3">
          <PreviewImage
            src={image}
            alt={displayLabel}
            wrapperClassName="h-16 w-16 shrink-0 rounded-sm border border-border bg-muted"
            sizes="64px"
          />
          <div className="min-w-0">
            <h1 className="text-lg leading-tight font-black text-foreground">
              {displayLabel || <Placeholder>Libellé de la catégorie</Placeholder>}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {description.trim() || <Placeholder>Description non renseignée</Placeholder>}
            </p>
          </div>
        </div>

        {/* La grille de produits n'est pas simulée : elle ne dépend pas de ce
            formulaire. Un repère suffit à situer le guide dans la page. */}
        <div className="mb-4 rounded-sm border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
          Grille des produits de la catégorie
        </div>

        <section className="border-t border-border pt-4">
          <h2 className="text-sm font-black text-foreground">
            {displayLabel ? `${displayLabel} chez MLC Bois` : "Guide d'achat"}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {intro.trim() || <Placeholder>Introduction du guide non renseignée</Placeholder>}
          </p>

          {filledSections.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {filledSections.map((section, index) => (
                // Les sections n'ont pas d'identifiant propre, la position sert de clé.
                <div key={index}>
                  <h3 className="mb-1 text-xs font-bold text-foreground">
                    {section.heading.trim() || <Placeholder>Titre de section</Placeholder>}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {section.body.trim() || <Placeholder>Texte de section</Placeholder>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {closing.trim() && (
            <div className="mt-4 rounded-sm bg-secondary px-4 py-4 text-secondary-foreground">
              <p className="text-xs">{closing}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-sm bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
                  {displayLabel ? `${displayLabel} entdecken` : "Produkte entdecken"}
                </span>
                <span className="rounded-sm bg-white/10 px-3 py-1.5 text-[11px] font-bold">
                  Beratung anfragen
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
