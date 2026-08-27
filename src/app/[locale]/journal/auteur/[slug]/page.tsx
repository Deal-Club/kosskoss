import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/kk/chrome";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { RichText } from "@/components/RichText";
import { ArticleGrid } from "@/components/journal/article-card";
import {
  EmptyJournal,
  JOURNAL_PAGE_SIZE,
  JournalPagination,
} from "@/components/journal/journal-listing";
import { listPublishedArticles } from "@/server/journal/read";
import { getAuthorBySlug } from "@/server/journal/taxonomy";
import { paginate, parsePageParam } from "@/lib/pagination";
import { alternatesFor, localizedUrl } from "@/lib/hreflang";
import { absoluteUrl } from "@/server/merchant";
import type { Locale } from "@/i18n/routing";

type AuthorParams = Promise<{ locale: Locale; slug: string }>;
type PageSearch = Promise<{ page?: string | string[] }>;

export async function generateMetadata({ params }: { params: AuthorParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getAuthorBySlug(slug, locale);
  if (!author) return {};

  return {
    title: author.role ? `${author.name} · ${author.role}` : author.name,
    description: author.bio || undefined,
    alternates: alternatesFor(`/journal/auteur/${author.slug}`, locale),
    // Une page auteur sans article publié n'apporte rien à l'index.
    robots: author.publishedCount === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function JournalAuthorPage({
  params,
  searchParams,
}: {
  params: AuthorParams;
  searchParams: PageSearch;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const author = await getAuthorBySlug(slug, locale);
  if (!author) notFound();

  const page = parsePageParam((await searchParams).page);
  const articles = await listPublishedArticles(locale, { authorSlug: author.slug });
  const pageInfo = paginate(articles, page, JOURNAL_PAGE_SIZE);

  const journalLabel = locale === "en" ? "Journal" : "Le Journal";
  const socials = Object.entries(author.socials);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <header className="border-b border-border bg-cream">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 sm:py-16">
            {author.avatar ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-sand">
                <Image src={author.avatar} alt="" fill sizes="96px" className="object-cover" />
              </div>
            ) : null}

            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-widest text-gold-ink uppercase">
                {locale === "en" ? "Author" : "Auteur"}
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold text-deep">{author.name}</h1>
              {author.role ? <p className="mt-1 text-deep/70">{author.role}</p> : null}
              {author.bio ? (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-deep/75">
                  <RichText text={author.bio} />
                </p>
              ) : null}

              {socials.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-3 text-sm">
                  {socials.map(([network, href]) => (
                    <li key={network}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-deep kk-underline"
                      >
                        {network}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-4 text-sm text-muted-foreground">
                {locale === "en"
                  ? `${author.publishedCount} published article${author.publishedCount > 1 ? "s" : ""}`
                  : `${author.publishedCount} article${author.publishedCount > 1 ? "s" : ""} publié${author.publishedCount > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <Breadcrumb items={[{ label: journalLabel, href: "/journal" }, { label: author.name }]} />

          {pageInfo.items.length > 0 ? (
            <>
              <ArticleGrid articles={pageInfo.items} locale={locale} className="mt-10" />
              <JournalPagination
                page={pageInfo.page}
                pageCount={pageInfo.pageCount}
                basePath={`/journal/auteur/${author.slug}`}
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

      {/* `sameAs` relie la signature aux profils publics : c'est ce qui permet à
          un moteur de rattacher l'auteur à une personne réelle plutôt qu'à un
          simple nom sur une page. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: author.name,
            jobTitle: author.role || undefined,
            description: author.bio || undefined,
            image: author.avatar ? absoluteUrl(author.avatar) : undefined,
            url: localizedUrl(`/journal/auteur/${author.slug}`, locale),
            sameAs: socials.length > 0 ? socials.map(([, href]) => href) : undefined,
          },
        }}
      />
    </div>
  );
}
