import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/kk/chrome";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { ArticleGrid } from "@/components/journal/article-card";
import {
  CategoryPills,
  EmptyJournal,
  JOURNAL_PAGE_SIZE,
  JournalHero,
  JournalNewsletter,
  JournalPagination,
} from "@/components/journal/journal-listing";
import { listPublishedArticles } from "@/server/journal/read";
import { getCategoryBySlug, listPublicCategories } from "@/server/journal/taxonomy";
import { paginate, parsePageParam } from "@/lib/pagination";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type CategoryParams = Promise<{ locale: Locale; slug: string }>;
type PageSearch = Promise<{ page?: string | string[] }>;

export async function generateMetadata({ params }: { params: CategoryParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug, locale);
  if (!category) return {};

  return {
    title: category.metaTitle || `${category.label} · ${locale === "en" ? "Journal" : "Le Journal"} ${BRAND.name}`,
    description: category.metaDescription || category.description || undefined,
    alternates: alternatesFor(`/journal/categorie/${category.slug}`, locale),
    // Une rubrique vide n'a rien à faire dans l'index : c'est une page sans
    // contenu, elle dessert le site au lieu de le servir.
    robots: category.publishedCount === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function JournalCategoryPage({
  params,
  searchParams,
}: {
  params: CategoryParams;
  searchParams: PageSearch;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();

  const page = parsePageParam((await searchParams).page);
  const [articles, categories] = await Promise.all([
    listPublishedArticles(locale, { categorySlug: category.slug }),
    listPublicCategories(locale),
  ]);
  const pageInfo = paginate(articles, page, JOURNAL_PAGE_SIZE);

  const journalLabel = locale === "en" ? "Journal" : "Le Journal";

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <JournalHero
          eyebrow={journalLabel}
          title={category.label}
          intro={category.description || undefined}
        />

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <Breadcrumb
            items={[{ label: journalLabel, href: "/journal" }, { label: category.label }]}
          />

          <div className="mt-8">
            <CategoryPills categories={categories} activeSlug={category.slug} locale={locale} />
          </div>

          {pageInfo.items.length > 0 ? (
            <>
              <ArticleGrid articles={pageInfo.items} locale={locale} className="mt-12" />
              <JournalPagination
                page={pageInfo.page}
                pageCount={pageInfo.pageCount}
                basePath={`/journal/categorie/${category.slug}`}
                locale={locale}
              />
            </>
          ) : (
            <div className="mt-12">
              <EmptyJournal locale={locale} />
            </div>
          )}

          <JournalNewsletter locale={locale} />
        </div>
      </main>

      <SiteFooter />

      <BreadcrumbJsonLd
        items={[{ label: journalLabel, href: "/journal" }, { label: category.label }]}
      />
    </div>
  );
}
