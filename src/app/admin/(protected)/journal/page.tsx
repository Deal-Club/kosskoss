import Link from "next/link";
import { Trash2 } from "lucide-react";
import { requireCapacitePage } from "@/lib/dal";
import { ArticleTable } from "@/components/admin/journal/ArticleTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { countTrashedArticles, listAdminArticles } from "@/server/journal/store";
import { listAuthors, listCategories } from "@/server/journal/taxonomy";
import { nextScheduledAt } from "@/server/journal/schedule";
import {
  JOURNAL_SORT_OPTIONS,
  filterAndSortArticles,
  isJournalSort,
  type JournalSort,
} from "@/lib/journal/listing";
import { paginate, parsePageParam } from "@/lib/pagination";
import { ARTICLE_STATUSES, ARTICLE_STATUS_LABELS, isArticleStatus } from "@/types/journal";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

type Search = Promise<{
  q?: string;
  status?: string;
  categoryId?: string;
  authorId?: string;
  sort?: string;
  page?: string;
  corbeille?: string;
}>;

export default async function AdminJournalPage({ searchParams }: { searchParams: Search }) {
  await requireCapacitePage("contenu");
  const params = await searchParams;
  const trashed = params.corbeille === "1";
  const query = (params.q ?? "").trim();
  const sort: JournalSort = isJournalSort(params.sort) ? params.sort : "recent";
  const status = isArticleStatus(params.status) ? params.status : undefined;

  const [articles, categories, authors, trashCount, nextDue] = await Promise.all([
    listAdminArticles({ trashed }),
    listCategories(),
    listAuthors(),
    countTrashedArticles(),
    nextScheduledAt(),
  ]);

  const filtered = filterAndSortArticles(articles, {
    query,
    status,
    categoryId: params.categoryId || undefined,
    authorId: params.authorId || undefined,
    sort,
  });
  const pageInfo = paginate(filtered, parsePageParam(params.page));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Le Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trashed
              ? "Articles à la corbeille. Ils ne sont plus visibles sur la boutique."
              : "Articles, conseils et guides publiés sur la boutique."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/journal/taxonomie"
            className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            Rubriques &amp; auteurs
          </Link>
          <Link
            href={trashed ? "/admin/journal" : "/admin/journal?corbeille=1"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm border px-4 py-2 text-sm font-bold",
              trashed
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-white text-foreground hover:border-primary",
            )}
          >
            <Trash2 className="h-4 w-4" />
            Corbeille{trashCount > 0 ? ` (${trashCount})` : ""}
          </Link>
          <Link
            href="/admin/journal/new"
            className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Nouvel article
          </Link>
        </div>
      </div>

      {/* La prochaine échéance est affichée : sans elle, on ne sait pas si la
          tâche planifiée est réellement branchée. */}
      {!trashed && nextDue ? (
        <p className="mb-4 rounded-sm border border-border bg-white px-4 py-2 text-sm text-muted-foreground">
          Prochaine publication programmée le{" "}
          <strong className="text-foreground">
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(nextDue)}
          </strong>
          .
        </p>
      ) : null}

      {/* ---- Filtres ---- */}
      {!trashed ? (
        <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/journal">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Rechercher un titre…"
            className={cn(inputClass, "min-w-48 flex-1")}
          />

          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">Tous les statuts</option>
            {ARTICLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ARTICLE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>

          <select name="categoryId" defaultValue={params.categoryId ?? ""} className={inputClass}>
            <option value="">Toutes les rubriques</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          <select name="authorId" defaultValue={params.authorId ?? ""} className={inputClass}>
            <option value="">Tous les auteurs</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>

          <select name="sort" defaultValue={sort} className={inputClass}>
            {JOURNAL_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-sm border border-border bg-white px-4 py-1.5 text-sm font-bold text-foreground hover:border-primary"
          >
            Filtrer
          </button>
        </form>
      ) : null}

      <ArticleTable articles={pageInfo.items} trashed={trashed} />

      <AdminPagination
        basePath="/admin/journal"
        params={{
          ...(query ? { q: query } : {}),
          ...(status ? { status } : {}),
          ...(params.categoryId ? { categoryId: params.categoryId } : {}),
          ...(params.authorId ? { authorId: params.authorId } : {}),
          ...(sort !== "recent" ? { sort } : {}),
          ...(trashed ? { corbeille: "1" } : {}),
        }}
        page={pageInfo.page}
        pageCount={pageInfo.pageCount}
        totalItems={pageInfo.totalItems}
        firstItem={pageInfo.firstItem}
        lastItem={pageInfo.lastItem}
        label="articles"
      />
    </div>
  );
}
