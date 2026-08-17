import Image from "next/image";
import { Clock } from "lucide-react";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { cn } from "@/lib/utils";
import type { ArticleSummary } from "@/server/journal/read";

/**
 * Vignette d'article, en deux tailles.
 *
 * La date est rendue dans une balise `<time datetime>` : c'est ce que lisent
 * les robots et les lecteurs d'écran, quel que soit le format affiché.
 */

export function formatArticleDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function ReadingTime({ minutes, locale }: { minutes: number; locale: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {locale === "en" ? `${minutes} min read` : `${minutes} min de lecture`}
    </span>
  );
}

export function ArticleCard({
  article,
  locale,
  priority = false,
}: {
  article: ArticleSummary;
  locale: string;
  priority?: boolean;
}) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/journal/${article.slug}`}
        className="kk-lift relative block aspect-[3/2] overflow-hidden rounded-2xl border border-border/70 bg-cream focus-visible:ring-2 focus-visible:ring-deep focus-visible:outline-none"
      >
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.coverAlt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        {article.category ? (
          <Link
            href={`/journal/categorie/${article.category.slug}`}
            className="text-[11px] font-bold tracking-widest text-gold-ink uppercase kk-underline self-start"
          >
            {article.category.label}
          </Link>
        ) : null}

        <h3 className="mt-2 font-display text-lg leading-snug font-bold text-deep">
          <Link href={`/journal/${article.slug}`} className="kk-underline">
            {article.title}
          </Link>
        </h3>

        {article.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={article.publishedAt.toISOString()}>
            {formatArticleDate(article.publishedAt, locale)}
          </time>
          <span aria-hidden="true">·</span>
          <ReadingTime minutes={article.readingMinutes} locale={locale} />
        </div>
      </div>
    </article>
  );
}

/** Grande carte de l'article mis en avant, en tête de la page du Journal. */
export function FeaturedArticleCard({
  article,
  locale,
}: {
  article: ArticleSummary;
  locale: string;
}) {
  return (
    <article className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
      <Link
        href={`/journal/${article.slug}`}
        className="kk-lift relative block aspect-[4/3] overflow-hidden rounded-3xl border border-border/70 bg-cream focus-visible:ring-2 focus-visible:ring-deep focus-visible:outline-none"
      >
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.coverAlt}
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-deep px-3 py-1 text-[11px] font-bold tracking-widest text-white uppercase">
            {locale === "en" ? "Featured" : "À la une"}
          </span>
          {article.category ? (
            <Link
              href={`/journal/categorie/${article.category.slug}`}
              className="text-[11px] font-bold tracking-widest text-gold-ink uppercase kk-underline"
            >
              {article.category.label}
            </Link>
          ) : null}
        </div>

        <h2 className="mt-4 font-display text-3xl leading-tight font-bold text-deep sm:text-4xl">
          <Link href={`/journal/${article.slug}`} className="kk-underline">
            {article.title}
          </Link>
        </h2>

        {article.excerpt ? (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{article.excerpt}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {article.author ? (
            <Link href={`/journal/auteur/${article.author.slug}`} className="font-medium text-deep kk-underline">
              {article.author.name}
            </Link>
          ) : null}
          {article.author ? <span aria-hidden="true">·</span> : null}
          <time dateTime={article.publishedAt.toISOString()}>
            {formatArticleDate(article.publishedAt, locale)}
          </time>
          <span aria-hidden="true">·</span>
          <ReadingTime minutes={article.readingMinutes} locale={locale} />
        </div>
      </div>
    </article>
  );
}

export function ArticleGrid({
  articles,
  locale,
  className,
}: {
  articles: readonly ArticleSummary[];
  locale: string;
  className?: string;
}) {
  if (articles.length === 0) return null;

  return (
    <div className={cn("grid gap-8 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {articles.map((article, index) => (
        <ArticleCard key={article.id} article={article} locale={locale} priority={index < 3} />
      ))}
    </div>
  );
}
