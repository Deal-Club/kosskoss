import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Barre de pagination générique, découplée de tout filtre : l'appelant fournit
 * seulement le numéro de page courant, le total, et la façon de construire
 * l'URL d'une page donnée. Utilisée par le catalogue (avec marque, besoin et
 * tri dans l'URL) et par la page de marque (sans aucun filtre) — deux
 * appelants, une seule barre, plutôt que deux copies qui auraient divergé.
 */

/**
 * Numéros à afficher : toujours la première et la dernière page, la page
 * courante et ses voisines, un « … » pour les trous. Sur vingt pages, aligner
 * vingt numéros donne une barre plus large que la grille.
 */
function numerosDePage(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const autour = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => autour.add(n));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => autour.add(n));

  const retenus = [...autour].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const sortie: (number | "gap")[] = [];
  let precedent = 0;
  for (const n of retenus) {
    if (precedent && n - precedent > 1) sortie.push("gap");
    sortie.push(n);
    precedent = n;
  }
  return sortie;
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Construit l'URL d'une page donnée ; filtres et tri restent à la charge de l'appelant. */
  hrefForPage: (page: number) => string;
  /** Libellé du `<nav>`, distinct selon ce qui est paginé (produits d'un rayon, d'une marque…). */
  ariaLabel?: string;
}

export function Pagination({ page, pageCount, hrefForPage, ariaLabel = "Pagination" }: PaginationProps) {
  if (pageCount <= 1) return null;

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm transition";

  return (
    <nav aria-label={ariaLabel} className="mt-12 flex flex-col items-center gap-4">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <a href={hrefForPage(page - 1)} rel="prev" className={`${base} gap-1 text-deep hover:bg-cream`}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Précédent</span>
              <span className="sr-only sm:hidden">Page précédente</span>
            </a>
          ) : (
            // Désactivé = absent du parcours au clavier, mais la place reste
            // prise : sinon la barre saute latéralement d'une page à l'autre.
            <span aria-hidden="true" className={`${base} gap-1 text-muted-foreground/40`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Précédent</span>
            </span>
          )}
        </li>

        {numerosDePage(page, pageCount).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted-foreground">
              &hellip;
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={`${base} bg-deep font-semibold text-primary-foreground`}>
                  {n}
                </span>
              ) : (
                <a href={hrefForPage(n)} className={`${base} text-foreground hover:bg-cream hover:text-deep`}>
                  <span className="sr-only">Page </span>
                  {n}
                </a>
              )}
            </li>
          ),
        )}

        <li>
          {page < pageCount ? (
            <a href={hrefForPage(page + 1)} rel="next" className={`${base} gap-1 text-deep hover:bg-cream`}>
              <span className="hidden sm:inline">Suivant</span>
              <span className="sr-only sm:hidden">Page suivante</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <span aria-hidden="true" className={`${base} gap-1 text-muted-foreground/40`}>
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </li>
      </ul>

      <p className="text-xs text-muted-foreground">
        Page {page} sur {pageCount}
      </p>
    </nav>
  );
}
