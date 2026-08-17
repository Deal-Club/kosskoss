import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/kk/chrome";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ArticleGrid } from "@/components/journal/article-card";
import {
  EmptyJournal,
  JOURNAL_PAGE_SIZE,
  JournalHero,
  JournalPagination,
} from "@/components/journal/journal-listing";
import { listPublishedArticles } from "@/server/journal/read";
import { TAG_INDEX_THRESHOLD, getTagBySlug } from "@/server/journal/taxonomy";
import { paginate, parsePageParam } from "@/lib/pagination";
import { alternatesFor } from "@/lib/hreflang";
import type { Locale } from "@/i18n/routing";

type TagParams = Promise<{ locale: Locale; slug: string }>;
type PageSearch = Promise<{ page?: string | string[] }>;

export async function generateMetadata({ params }: { params: TagParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = await getTagBySlug(slug, locale);
  if (!tag) return {};

  const title = locale === "en" ? `Tagged “${tag.label}”` : `Articles étiquetés « ${tag.label} »`;

  return {
    title,
    description:
      locale === "en"
        ? `All Journal articles tagged “${tag.label}”.`
        : `Tous les articles du Journal étiquetés « ${tag.label} ».`,
    alternates: alternatesFor(`/journal/tag/${tag.slug}`, locale),
    // Hygiène d'indexation : un tag utilisé une ou deux fois produit une page
    // presque identique à celle de l'article. On la garde accessible — un
    // lecteur peut vouloir la parcourir — mais hors de l'index.
    robots:
      tag.publishedCount < TAG_INDEX_THRESHOLD ? { index: false, follow: true } : undefined,
  };
}

export default async function JournalTagPage({
  params,
  searchParams,
}: {
  params: TagParams;
  searchParams: PageSearch;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tag = await getTagBySlug(slug, locale);
  if (!tag) notFound();

  const page = parsePageParam((await searchParams).page);
  const articles = await listPublishedArticles(locale, { tagSlug: tag.slug });
  const pageInfo = paginate(articles, page, JOURNAL_PAGE_SIZE);

  const journalLabel = locale === "en" ? "Journal" : "Le Journal";
  const heading = locale === "en" ? `Tagged “${tag.label}”` : `« ${tag.label} »`;

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <JournalHero
          eyebrow={locale === "en" ? "Tag" : "Étiquette"}
          title={heading}
          intro={
            locale === "en"
              ? `${articles.length} article${articles.length > 1 ? "s" : ""} in the Journal.`
              : `${articles.length} article${articles.length > 1 ? "s" : ""} dans le Journal.`
          }
        />

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <Breadcrumb items={[{ label: journalLabel, href: "/journal" }, { label: tag.label }]} />

          {pageInfo.items.length > 0 ? (
            <>
              <ArticleGrid articles={pageInfo.items} locale={locale} className="mt-10" />
              <JournalPagination
                page={pageInfo.page}
                pageCount={pageInfo.pageCount}
                basePath={`/journal/tag/${tag.slug}`}
                locale={locale}
              />
            </>
          ) : (
            <div className="mt-10">
              <EmptyJournal locale={locale} />
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
