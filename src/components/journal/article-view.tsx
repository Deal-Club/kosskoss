import Image from "next/image";
import { Clock, Eye } from "lucide-react";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { RichText } from "@/components/RichText";
import { ArticleBlocks } from "./article-blocks";
import { ArticleGrid, formatArticleDate } from "./article-card";
import { ShareButtons } from "./share-buttons";
import { TableOfContents } from "./table-of-contents";
import type { ArticleDetail, ArticleSummary } from "@/server/journal/read";
import type { KKProductView } from "@/types/kk";

/**
 * Corps d'une page article.
 *
 * Ce composant est utilisé à DEUX endroits : la page publique et l'aperçu du
 * back-office. C'est volontaire — l'aperçu doit montrer exactement ce que verra
 * un lecteur, pas une approximation qui dériverait au fil des modifications.
 * D'où l'absence totale d'accès aux données ici : tout arrive en props.
 */

function AuthorCard({
  article,
  locale,
}: {
  article: ArticleDetail;
  locale: string;
}) {
  if (!article.author) return null;

  return (
    <aside className="mt-12 flex flex-col gap-4 rounded-2xl border border-border bg-cream p-6 sm:flex-row sm:items-start">
      {article.author.avatar ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-sand">
          <Image
            src={article.author.avatar}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
          {locale === "en" ? "Written by" : "Écrit par"}
        </p>
        <Link
          href={`/journal/auteur/${article.author.slug}`}
          className="mt-1 block font-display text-lg font-bold text-deep kk-underline"
        >
          {article.author.name}
        </Link>
        {article.author.role ? (
          <p className="text-sm text-muted-foreground">{article.author.role}</p>
        ) : null}
        {article.authorBio ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            <RichText text={article.authorBio} />
          </p>
        ) : null}
      </div>
    </aside>
  );
}

export function ArticleView({
  article,
  products,
  related,
  locale,
  shareUrl,
}: {
  article: ArticleDetail;
  products: ReadonlyMap<string, KKProductView>;
  related: readonly ArticleSummary[];
  locale: string;
  shareUrl: string;
}) {
  const journalLabel = locale === "en" ? "Journal" : "Le Journal";

  return (
    <article className="pb-16">
      {/* ---- En-tête ---- */}
      <header className="border-b border-border bg-cream">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-6">
          <Breadcrumb
            items={[
              { label: journalLabel, href: "/journal" },
              ...(article.category
                ? [
                    {
                      label: article.category.label,
                      href: `/journal/categorie/${article.category.slug}`,
                    },
                  ]
                : []),
              { label: article.title },
            ]}
          />

          {article.category ? (
            <Link
              href={`/journal/categorie/${article.category.slug}`}
              className="mt-6 inline-block text-[11px] font-bold tracking-widest text-gold-ink uppercase kk-underline"
            >
              {article.category.label}
            </Link>
          ) : null}

          <h1 className="mt-3 font-display text-3xl leading-tight font-bold text-deep sm:text-[42px]">
            {article.title}
          </h1>

          {article.excerpt ? (
            <p className="mt-4 text-lg leading-relaxed text-deep/80">{article.excerpt}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            {article.author ? (
              <>
                <Link
                  href={`/journal/auteur/${article.author.slug}`}
                  className="font-medium text-deep kk-underline"
                >
                  {article.author.name}
                </Link>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <time dateTime={article.publishedAt.toISOString()}>
              {formatArticleDate(article.publishedAt, locale)}
            </time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {locale === "en"
                ? `${article.readingMinutes} min read`
                : `${article.readingMinutes} min de lecture`}
            </span>
            {article.viewCount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {article.viewCount}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* ---- Couverture ---- */}
      {article.coverImage ? (
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="relative -mt-0 aspect-[16/9] overflow-hidden rounded-b-3xl bg-cream sm:rounded-3xl sm:mt-8">
            <Image
              src={article.coverImage}
              alt={article.coverAlt}
              fill
              priority
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {/* ---- Corps ---- */}
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <TableOfContents entries={article.toc} locale={locale} className="mt-10" />

        {/* Largeur de colonne volontairement bornée : au-delà d'une
            soixantaine de caractères, l'œil perd la ligne suivante. */}
        <div className="mt-8">
          <ArticleBlocks blocks={article.blocks} products={products} locale={locale} />
        </div>

        {/* ---- Tags ---- */}
        {article.tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/journal/tag/${tag.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-deep transition hover:border-deep hover:bg-cream"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        ) : null}

        {/* ---- Partage ---- */}
        <div className="mt-8 border-t border-border pt-6">
          <ShareButtons url={shareUrl} title={article.title} locale={locale} />
        </div>

        <AuthorCard article={article} locale={locale} />
      </div>

      {/* ---- Articles similaires ---- */}
      {related.length > 0 ? (
        <section className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-deep">
            {locale === "en" ? "You might also like" : "Vous pourriez aussi aimer"}
          </h2>
          <ArticleGrid articles={related} locale={locale} className="mt-8" />
        </section>
      ) : null}
    </article>
  );
}
