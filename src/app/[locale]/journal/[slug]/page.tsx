import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/kk/chrome";
import { ArticleView } from "@/components/journal/article-view";
import { ViewPing } from "@/components/journal/view-ping";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import {
  findRedirectTarget,
  getPublishedArticle,
  listPublishedSlugs,
  listRelatedArticles,
} from "@/server/journal/read";
import { resolveCitedProducts } from "@/server/journal/products";
import { resolveArticleSeo } from "@/lib/journal/seo";
import { alternatesFor, localizedUrl } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type ArticleParams = Promise<{ locale: Locale; slug: string }>;

/**
 * Les articles publiés sont prérendus. `dynamicParams` reste vrai : un article
 * publié après le build — par la tâche planifiée, par exemple — doit s'afficher
 * sans attendre le déploiement suivant.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return slugs.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: ArticleParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getPublishedArticle(slug, locale);
  if (!article) return {};

  const canonical = localizedUrl(`/journal/${article.slug}`, locale);
  const seo = resolveArticleSeo(
    {
      title: article.title,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      ...article.seo,
    },
    { brandName: BRAND.name, canonical },
  );

  return {
    title: seo.title,
    description: seo.description,
    // Une canonique saisie à la main l'emporte ; sinon l'alternance de langue
    // habituelle, avec ses hreflang.
    alternates: seo.canonical === canonical
      ? alternatesFor(`/journal/${article.slug}`, locale)
      : { canonical: seo.canonical },
    robots: seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.canonical,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: article.author ? [article.author.name] : undefined,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle,
      description: seo.twitterDescription,
      images: seo.twitterImage ? [seo.twitterImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: ArticleParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await getPublishedArticle(slug, locale);

  if (!article) {
    // Un article renommé après publication garde son ancienne adresse vivante :
    // on redirige en 301 plutôt que de rendre un 404 sur une URL déjà indexée.
    const target = await findRedirectTarget(slug);
    if (target) permanentRedirect(`/journal/${target}`);
    notFound();
  }

  const [products, related] = await Promise.all([
    resolveCitedProducts(article.blocks, locale),
    listRelatedArticles(article, locale, 3),
  ]);

  const canonical = localizedUrl(`/journal/${article.slug}`, locale);
  const journalLabel = locale === "en" ? "Journal" : "Le Journal";

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <ArticleView
          article={article}
          products={products}
          related={related}
          locale={locale}
          shareUrl={canonical}
        />
      </main>

      <SiteFooter />

      {/* Le fil d'Ariane balisé reprend EXACTEMENT celui qui est affiché :
          Google compare les deux et ignore le balisage en cas d'écart. */}
      <BreadcrumbJsonLd
        items={[
          { label: journalLabel, href: "/journal" },
          ...(article.category
            ? [{ label: article.category.label, href: `/journal/categorie/${article.category.slug}` }]
            : []),
          { label: article.title },
        ]}
      />
      <ArticleJsonLd article={article} canonical={canonical} />
      <ViewPing slug={article.slug} />
    </div>
  );
}
