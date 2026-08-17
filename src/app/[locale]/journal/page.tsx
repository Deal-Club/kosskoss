import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/kk/chrome";
import { ArticleGrid } from "@/components/journal/article-card";
import {
  CategoryPills,
  EmptyJournal,
  FeaturedArticleCard,
  JOURNAL_PAGE_SIZE,
  JournalHero,
  JournalNewsletter,
  JournalPagination,
  PopularArticles,
} from "@/components/journal/journal-listing";
import { listPopularArticles, listPublishedArticles } from "@/server/journal/read";
import { listPublicCategories } from "@/server/journal/taxonomy";
import { paginate, parsePageParam } from "@/lib/pagination";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type PageParams = Promise<{ locale: Locale }>;
type PageSearch = Promise<{ page?: string | string[] }>;

const COPY = {
  fr: {
    eyebrow: "Le Journal",
    title: "Conseils beauté & guides d'achat",
    intro:
      "Comment lire une liste d'ingrédients, bâtir une routine qui tient dans le temps, choisir un soin adapté à sa peau et à son climat. Nos guides, écrits par l'équipe KossKoss Select.",
    recent: "Derniers articles",
    metaTitle: `Le Journal — ${BRAND.name}`,
    metaDescription:
      "Conseils beauté, guides d'achat et routines expliquées par l'équipe KossKoss Select.",
  },
  en: {
    eyebrow: "The Journal",
    title: "Beauty advice & buying guides",
    intro:
      "How to read an ingredient list, build a routine that lasts, and choose care suited to your skin and climate. Guides written by the KossKoss Select team.",
    recent: "Latest articles",
    metaTitle: `The Journal — ${BRAND.name}`,
    metaDescription:
      "Beauty advice, buying guides and routines explained by the KossKoss Select team.",
  },
} as const;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale];

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: alternatesFor("/journal", locale),
    openGraph: {
      type: "website",
      title: copy.metaTitle,
      description: copy.metaDescription,
    },
  };
}

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearch;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = parsePageParam((await searchParams).page);
  const copy = COPY[locale];

  const [articles, categories, popular] = await Promise.all([
    listPublishedArticles(locale),
    listPublicCategories(locale),
    listPopularArticles(locale, 3),
  ]);

  // L'article mis en avant ne réapparaît pas dans la grille : il est déjà en
  // tête de page, l'y remettre donnerait l'impression d'un doublon.
  const featured = page === 1 ? (articles.find((article) => article.featured) ?? null) : null;
  const rest = featured ? articles.filter((article) => article.id !== featured.id) : articles;
  const pageInfo = paginate(rest, page, JOURNAL_PAGE_SIZE);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <JournalHero eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />

        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <CategoryPills categories={categories} locale={locale} />

          {featured ? (
            <section className="mt-12">
              <FeaturedArticleCard article={featured} locale={locale} />
            </section>
          ) : null}

          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold text-deep">{copy.recent}</h2>
            {pageInfo.items.length > 0 ? (
              <>
                <ArticleGrid articles={pageInfo.items} locale={locale} className="mt-8" />
                <JournalPagination
                  page={pageInfo.page}
                  pageCount={pageInfo.pageCount}
                  basePath="/journal"
                  locale={locale}
                />
              </>
            ) : (
              <div className="mt-8">
                <EmptyJournal locale={locale} />
              </div>
            )}
          </section>

          <PopularArticles articles={popular} locale={locale} />
          <JournalNewsletter locale={locale} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
