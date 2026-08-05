import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageHref, type PageInfo } from "@/lib/pagination";

interface AdminPaginationProps extends PageInfo {
  basePath: string;
  /** Paramètres de la page courante : ils sont reconduits sur chaque lien. */
  params: Record<string, string | string[] | undefined>;
  /** Nom des éléments comptés, au pluriel : « produits », « commandes »… */
  label?: string;
  /** À préciser quand une page porte deux tableaux paginés séparément. */
  pageParam?: string;
}

/** Fenêtre de numéros autour de la page courante, avec les extrémités. */
function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const numbers = new Set<number>([1, pageCount, page]);
  if (page - 1 > 1) numbers.add(page - 1);
  if (page + 1 < pageCount) numbers.add(page + 1);

  const sorted = [...numbers].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });

  return result;
}

const buttonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-sm border border-border bg-white px-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary";

export function AdminPagination({
  basePath,
  params,
  page,
  pageCount,
  totalItems,
  firstItem,
  lastItem,
  label = "éléments",
  pageParam = "page",
}: AdminPaginationProps) {
  if (totalItems === 0) return null;

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <p className="text-xs text-muted-foreground">
        {firstItem}–{lastItem} sur {totalItems} {label}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link
              href={pageHref(basePath, params, page - 1, pageParam)}
              rel="prev"
              aria-label="Page précédente"
              className={buttonClass}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span className={cn(buttonClass, "opacity-40")} aria-hidden>
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}

          {pageNumbers(page, pageCount).map((value, index) =>
            value === "gap" ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Link
                key={value}
                href={pageHref(basePath, params, value, pageParam)}
                aria-current={value === page ? "page" : undefined}
                className={cn(
                  buttonClass,
                  value === page && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
                )}
              >
                {value}
              </Link>
            ),
          )}

          {page < pageCount ? (
            <Link
              href={pageHref(basePath, params, page + 1, pageParam)}
              rel="next"
              aria-label="Page suivante"
              className={buttonClass}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className={cn(buttonClass, "opacity-40")} aria-hidden>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
