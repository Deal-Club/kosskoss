import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { NewsletterBand } from "@/components/kk/newsletter";
import { ArticleGrid, FeaturedArticleCard } from "./article-card";
import { cn } from "@/lib/utils";
import type { ArticleSummary } from "@/server/journal/read";
import type { CategoryView } from "@/server/journal/taxonomy";

/**
 * Ossature commune aux pages de liste du Journal : accueil, catégorie, tag,
 * auteur. Les quatre affichent la même chose — un en-tête, une grille, une
 * pagination — et n'avaient aucune raison d'être écrites quatre fois.
 */

export const JOURNAL_PAGE_SIZE = 9;

export function JournalHero({
  title,
  intro,
  eyebrow,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
}) {
  return (
    <header className="border-b border-border bg-cream">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow ? (
          <p className="text-[11px] font-bold tracking-widest text-gold-ink uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-display text-4xl leading-tight font-bold text-deep sm:text-5xl">
          {title}
        </h1>
        {intro ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-deep/75">{intro}</p>
        ) : null}
      </div>
    </header>
  );
}

/** Rubriques du Journal, en tête de liste. */
export function CategoryPills({
  categories,
  activeSlug,
  locale,
}: {
  categories: readonly CategoryView[];
  activeSlug?: string;
  locale: string;
}) {
  if (categories.length === 0) return null;

  const pill =
    "rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-deep focus-visible:outline-none";

  return (
    <nav aria-label={locale === "en" ? "Journal sections" : "Rubriques du Journal"}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/journal"
            className={cn(
              pill,
              activeSlug
                ? "border-border text-deep hover:border-deep hover:bg-cream"
                : "border-deep bg-deep text-white",
            )}
          >
            {locale === "en" ? "All" : "Tout"}
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/journal/categorie/${category.slug}`}
              className={cn(
                pill,
                activeSlug === category.slug
                  ? "border-deep bg-deep text-white"
                  : "border-border text-deep hover:border-deep hover:bg-cream",
              )}
            >
              {category.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Pagination.
 *
 * Des liens, pas des boutons : chaque page a sa propre adresse, partageable et
 * explorable par un robot. Les pages au-delà de la première portent un
 * `noindex` — voir `generateMetadata` des pages concernées.
 */
export function JournalPagination({
  page,
  pageCount,
  basePath,
  locale,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  locale: string;
}) {
  if (pageCount <= 1) return null;

  const link = "rounded-full border border-border px-4 py-2 text-sm font-medium text-deep transition hover:border-deep hover:bg-cream";
  const hrefFor = (target: number) => (target <= 1 ? basePath : `${basePath}?page=${target}`);

  return (
    <nav
      aria-label={locale === "en" ? "Pagination" : "Pagination"}
      className="mt-12 flex items-center justify-center gap-3"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={link}>
          {locale === "en" ? "Previous" : "Précédent"}
        </Link>
      ) : null}

      <span className="text-sm text-muted-foreground">
        {locale === "en" ? `Page ${page} of ${pageCount}` : `Page ${page} sur ${pageCount}`}
      </span>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className={link}>
          {locale === "en" ? "Next" : "Suivant"}
        </Link>
      ) : null}
    </nav>
  );
}

export function EmptyJournal({ locale }: { locale: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-cream px-6 py-12 text-center text-sm text-muted-foreground">
      {locale === "en"
        ? "No article published yet in this section."
        : "Aucun article publié dans cette rubrique pour le moment."}
    </p>
  );
}

/** Bloc « les plus lus », en pied de liste. */
export function PopularArticles({
  articles,
  locale,
}: {
  articles: readonly ArticleSummary[];
  locale: string;
}) {
  // Tant qu'aucun article n'a été lu, ce bloc ne ferait que réafficher les
  // trois derniers — un doublon de la grille juste au-dessus. Il n'apparaît
  // donc qu'à partir du moment où le compteur dit quelque chose.
  if (articles.length === 0 || articles.every((article) => article.viewCount === 0)) return null;

  return (
    <section className="mt-20">
      <h2 className="font-display text-2xl font-bold text-deep">
        {locale === "en" ? "Most read" : "Les plus lus"}
      </h2>
      <ArticleGrid articles={articles} locale={locale} className="mt-8" />
    </section>
  );
}

export function JournalNewsletter({ locale }: { locale: string }) {
  return (
    <section className="mt-20">
      <NewsletterBand locale={locale} />
    </section>
  );
}

export { FeaturedArticleCard };
