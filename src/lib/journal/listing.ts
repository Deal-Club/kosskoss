/**
 * Filtrage et tri de la liste du back-office.
 *
 * Même parti pris que `src/server/productListing.ts` : le travail se fait en
 * mémoire. Les volumes concernés — quelques centaines d'articles au plus — ne
 * justifient pas un LIMIT/OFFSET, et cela garde la recherche, les filtres et la
 * pagination sur les mêmes données.
 *
 * La normalisation des accents n'est pas un détail de confort : en français,
 * personne ne tape « acné » avec son accent dans un champ de recherche.
 */

import type { ArticleStatus } from "@/types/journal";

export const JOURNAL_SORT_OPTIONS = [
  { value: "recent", label: "Plus récents" },
  { value: "title", label: "Titre (A → Z)" },
  { value: "views", label: "Plus consultés" },
] as const;

export type JournalSort = (typeof JOURNAL_SORT_OPTIONS)[number]["value"];

export function isJournalSort(value: unknown): value is JournalSort {
  return JOURNAL_SORT_OPTIONS.some((option) => option.value === value);
}

export interface FilterableArticle {
  readonly slug: string;
  readonly title: string;
  readonly status: ArticleStatus;
  readonly categoryId: string | null;
  readonly authorId: string | null;
  readonly viewCount: number;
  readonly featured: boolean;
  readonly publishedAt: Date | null;
  readonly updatedAt: Date;
}

export interface JournalFilters {
  readonly query?: string;
  readonly status?: ArticleStatus;
  readonly categoryId?: string;
  readonly authorId?: string;
  readonly featuredOnly?: boolean;
  readonly sort?: JournalSort;
}

/**
 * Même repli que la recherche produits (`src/app/[locale]/recherche/page.tsx`) :
 * minuscules, ligatures françaises développées, diacritiques retirés. Les mots
 * restent séparés — contrairement à `slugify` — pour que chaque terme se
 * retrouve indépendamment.
 */
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Comparateur français : « é » se range avec « e », pas après « z ». */
const collator = new Intl.Collator("fr", { sensitivity: "base" });

function sortedBy<T extends FilterableArticle>(rows: readonly T[], sort: JournalSort): T[] {
  const copy = [...rows];

  switch (sort) {
    case "title":
      return copy.sort((a, b) => collator.compare(a.title, b.title));

    case "views":
      return copy.sort((a, b) => b.viewCount - a.viewCount);

    case "recent":
      // Un brouillon n'a pas de date de publication : c'est sa dernière
      // modification qui le situe, sinon il tomberait toujours en fin de liste
      // alors que c'est justement sur lui qu'on travaille.
      return copy.sort(
        (a, b) =>
          (b.publishedAt ?? b.updatedAt).getTime() - (a.publishedAt ?? a.updatedAt).getTime(),
      );
  }
}

export function filterAndSortArticles<T extends FilterableArticle>(
  rows: readonly T[],
  filters: JournalFilters,
): T[] {
  const terms = fold(filters.query ?? "").split(/\s+/).filter(Boolean);

  const kept = rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.authorId && row.authorId !== filters.authorId) return false;
    if (filters.featuredOnly && !row.featured) return false;

    if (terms.length === 0) return true;
    const haystack = fold(`${row.title} ${row.slug}`);
    return terms.every((term) => haystack.includes(term));
  });

  return sortedBy(kept, filters.sort ?? "recent");
}
