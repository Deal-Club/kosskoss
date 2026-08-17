import { cn } from "@/lib/utils";
import type { TocEntry } from "@/types/journal";

/**
 * Sommaire d'un article.
 *
 * Les ancres viennent de `tableOfContents()`, la même fonction qui pose les
 * `id` sur les titres rendus : les deux ne peuvent pas diverger. Rien ici n'est
 * en JavaScript — ce sont des liens d'ancrage, ils fonctionnent au clavier, se
 * partagent, et survivent à une page dont le script n'a pas chargé.
 *
 * Le sommaire n'apparaît qu'à partir de trois titres : au-dessous, il occupe
 * plus de place qu'il n'en fait gagner.
 */

export const TOC_MIN_ENTRIES = 3;

export function TableOfContents({
  entries,
  locale,
  className,
}: {
  entries: readonly TocEntry[];
  locale: string;
  className?: string;
}) {
  if (entries.length < TOC_MIN_ENTRIES) return null;

  return (
    <nav
      aria-label={locale === "en" ? "Table of contents" : "Sommaire"}
      className={cn("rounded-2xl border border-border bg-cream p-5", className)}
    >
      <p className="text-xs font-bold tracking-widest text-deep uppercase">
        {locale === "en" ? "Contents" : "Sommaire"}
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? "pl-4" : undefined}>
            <a
              href={`#${entry.id}`}
              className="text-deep/85 transition hover:text-deep kk-underline"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
