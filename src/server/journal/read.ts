/**
 * Lectures publiques du Journal.
 *
 * Un seul `where` décide de ce qui est servi (`PUBLIC_WHERE`) : publié, daté
 * dans le passé, hors corbeille. Le filtre est appliqué ici et nulle part
 * ailleurs — un brouillon ne peut pas fuiter parce qu'un composant a oublié une
 * condition.
 *
 * La date est comparée en base plutôt qu'en mémoire : un article programmé sort
 * ainsi à la première visite qui suit son heure, que la tâche planifiée ait
 * tourné ou non.
 *
 * Traduction : même convention que le catalogue (`localizedContent.ts`). Les
 * colonnes `*En` sont facultatives et vides = repli sur le français. Jamais de
 * champ vide sur la boutique anglaise.
 */

import { cache } from "react";
import { prisma } from "@/server/prisma";
import { parseStoredBlocks } from "@/lib/journal/blocks";
import { tableOfContents } from "@/lib/journal/content";
import { pickRelated } from "@/lib/journal/related";
import { pickText } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";
import type { JournalBlock, TocEntry } from "@/types/journal";

// ---- Vues ----

export interface ArticleTagView {
  readonly slug: string;
  readonly label: string;
}

export interface ArticleAuthorView {
  readonly slug: string;
  readonly name: string;
  readonly role: string;
  readonly avatar: string;
}

export interface ArticleCategoryView {
  readonly slug: string;
  readonly label: string;
}

export interface ArticleSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly coverImage: string;
  readonly coverAlt: string;
  readonly readingMinutes: number;
  readonly viewCount: number;
  readonly featured: boolean;
  readonly publishedAt: Date;
  readonly category: ArticleCategoryView | null;
  readonly author: ArticleAuthorView | null;
  readonly tags: readonly ArticleTagView[];
}

export interface ArticleDetail extends ArticleSummary {
  readonly blocks: readonly JournalBlock[];
  readonly toc: readonly TocEntry[];
  readonly updatedAt: Date;
  readonly authorBio: string;
  /** Champs bruts pour `resolveArticleSeo`, déjà localisés. */
  readonly seo: {
    readonly metaTitle: string;
    readonly metaDescription: string;
    readonly canonicalUrl: string;
    readonly robotsNoindex: boolean;
    readonly ogTitle: string;
    readonly ogDescription: string;
    readonly ogImage: string;
    readonly twitterTitle: string;
    readonly twitterDescription: string;
    readonly twitterImage: string;
  };
}

// ---- Filtre unique ----

function publicWhere(now: Date) {
  return {
    deletedAt: null,
    status: "published",
    publishedAt: { lte: now, not: null },
  } as const;
}

const listInclude = {
  category: { select: { slug: true, label: true, labelEn: true } },
  author: { select: { slug: true, name: true, role: true, roleEn: true, avatar: true } },
  tags: { select: { tag: { select: { slug: true, label: true, labelEn: true } } } },
} as const;

type ListRow = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  coverImage: string;
  coverAlt: string;
  coverAltEn: string;
  readingMinutes: number;
  viewCount: number;
  featured: boolean;
  publishedAt: Date | null;
  category: { slug: string; label: string; labelEn: string } | null;
  author: { slug: string; name: string; role: string; roleEn: string; avatar: string } | null;
  tags: { tag: { slug: string; label: string; labelEn: string } }[];
};

function toSummary(row: ListRow, locale: Locale): ArticleSummary {
  // Repli sur le français partout ailleurs dans la boutique : jamais un accès
  // direct au champ `*En` en dehors de `pickText`.
  const english = locale === "en";
  return {
    id: row.id,
    slug: row.slug,
    title: pickText(row.title, english ? row.titleEn : undefined),
    excerpt: pickText(row.excerpt, english ? row.excerptEn : undefined),
    coverImage: row.coverImage,
    coverAlt: pickText(row.coverAlt, english ? row.coverAltEn : undefined),
    readingMinutes: row.readingMinutes,
    viewCount: row.viewCount,
    featured: row.featured,
    // Le filtre public garantit une date ; le repli protège d'une lecture
    // faite hors de ce filtre.
    publishedAt: row.publishedAt ?? new Date(0),
    category: row.category
      ? {
          slug: row.category.slug,
          label: pickText(row.category.label, english ? row.category.labelEn : undefined),
        }
      : null,
    author: row.author
      ? {
          slug: row.author.slug,
          name: row.author.name,
          role: pickText(row.author.role, english ? row.author.roleEn : undefined),
          avatar: row.author.avatar,
        }
      : null,
    tags: row.tags.map((link) => ({
      slug: link.tag.slug,
      label: pickText(link.tag.label, english ? link.tag.labelEn : undefined),
    })),
  };
}

// ---- Listes ----

export interface ListFilters {
  readonly categorySlug?: string;
  readonly tagSlug?: string;
  readonly authorSlug?: string;
  readonly featuredOnly?: boolean;
  readonly limit?: number;
  readonly excludeId?: string;
}

export async function listPublishedArticles(
  locale: Locale,
  filters: ListFilters = {},
): Promise<ArticleSummary[]> {
  const rows = await prisma.article.findMany({
    where: {
      ...publicWhere(new Date()),
      ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
      ...(filters.tagSlug ? { tags: { some: { tag: { slug: filters.tagSlug } } } } : {}),
      ...(filters.authorSlug ? { author: { slug: filters.authorSlug } } : {}),
      ...(filters.featuredOnly ? { featured: true } : {}),
      ...(filters.excludeId ? { id: { not: filters.excludeId } } : {}),
    },
    include: listInclude,
    orderBy: [{ publishedAt: "desc" }],
    ...(filters.limit ? { take: filters.limit } : {}),
  });

  return rows.map((row) => toSummary(row, locale));
}

/**
 * Les plus lus.
 *
 * Lit le compteur dénormalisé `viewCount`, jamais un agrégat sur la table des
 * vues : la page du Journal est rendue statiquement, elle ne peut pas payer un
 * GROUP BY.
 */
export async function listPopularArticles(locale: Locale, limit: number): Promise<ArticleSummary[]> {
  const rows = await prisma.article.findMany({
    where: publicWhere(new Date()),
    include: listInclude,
    orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => toSummary(row, locale));
}

// ---- Détail ----

/**
 * Article publié, mis en cache pour la durée du rendu : `generateMetadata` et
 * la page elle-même le lisent, la base n'est interrogée qu'une fois.
 */
export const getPublishedArticle = cache(
  async (slug: string, locale: Locale): Promise<ArticleDetail | null> => {
    const row = await prisma.article.findFirst({
      where: { ...publicWhere(new Date()), slug },
      include: {
        ...listInclude,
        author: {
          select: {
            slug: true,
            name: true,
            role: true,
            roleEn: true,
            avatar: true,
            bio: true,
            bioEn: true,
          },
        },
      },
    });
    if (!row) return null;

    const english = locale === "en";
    const blocks = parseStoredBlocks(
      english && row.blocksEn.trim() && row.blocksEn !== "[]" ? row.blocksEn : row.blocks,
    );

    return {
      ...toSummary(row, locale),
      blocks,
      toc: tableOfContents(blocks),
      updatedAt: row.updatedAt,
      authorBio: row.author ? pickText(row.author.bio, english ? row.author.bioEn : undefined) : "",
      seo: {
        metaTitle: pickText(row.metaTitle, english ? row.metaTitleEn : undefined),
        metaDescription: pickText(row.metaDescription, english ? row.metaDescriptionEn : undefined),
        canonicalUrl: row.canonicalUrl,
        robotsNoindex: row.robotsNoindex,
        ogTitle: row.ogTitle,
        ogDescription: row.ogDescription,
        ogImage: row.ogImage,
        twitterTitle: row.twitterTitle,
        twitterDescription: row.twitterDescription,
        twitterImage: row.twitterImage,
      },
    };
  },
);

/**
 * Article tel qu'il sera rendu, quel que soit son statut.
 *
 * Réservé à l'aperçu du back-office, qui est protégé par le layout `(protected)`.
 * Le filtre public est volontairement contourné ici — c'est tout l'intérêt de
 * l'aperçu — et c'est aussi pourquoi cette fonction ne doit jamais être appelée
 * depuis une page de la boutique.
 */
export async function getArticleForPreview(
  id: string,
  locale: Locale,
): Promise<ArticleDetail | null> {
  const row = await prisma.article.findUnique({
    where: { id },
    include: {
      ...listInclude,
      author: {
        select: {
          slug: true,
          name: true,
          role: true,
          roleEn: true,
          avatar: true,
          bio: true,
          bioEn: true,
        },
      },
    },
  });
  if (!row) return null;

  const english = locale === "en";
  const blocks = parseStoredBlocks(
    english && row.blocksEn.trim() && row.blocksEn !== "[]" ? row.blocksEn : row.blocks,
  );

  return {
    // Un brouillon n'a pas de date de publication : l'aperçu affiche celle du
    // jour plutôt qu'un trou dans la maquette.
    ...toSummary({ ...row, publishedAt: row.publishedAt ?? new Date() }, locale),
    blocks,
    toc: tableOfContents(blocks),
    updatedAt: row.updatedAt,
    authorBio: row.author ? pickText(row.author.bio, english ? row.author.bioEn : undefined) : "",
    seo: {
      metaTitle: pickText(row.metaTitle, english ? row.metaTitleEn : undefined),
      metaDescription: pickText(row.metaDescription, english ? row.metaDescriptionEn : undefined),
      canonicalUrl: row.canonicalUrl,
      robotsNoindex: row.robotsNoindex,
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImage: row.ogImage,
      twitterTitle: row.twitterTitle,
      twitterDescription: row.twitterDescription,
      twitterImage: row.twitterImage,
    },
  };
}

/**
 * Slug d'un article renommé après publication.
 * La page article consulte cette table avant de rendre un 404.
 */
export async function findRedirectTarget(oldSlug: string): Promise<string | null> {
  const row = await prisma.articleRedirect.findUnique({
    where: { oldSlug },
    select: { article: { select: { slug: true, status: true, deletedAt: true } } },
  });
  if (!row?.article) return null;
  if (row.article.deletedAt || row.article.status !== "published") return null;
  return row.article.slug;
}

// ---- Articles similaires ----

export async function listRelatedArticles(
  article: ArticleSummary,
  locale: Locale,
  limit = 3,
): Promise<ArticleSummary[]> {
  const rows = await prisma.article.findMany({
    where: { ...publicWhere(new Date()), id: { not: article.id } },
    include: listInclude,
    orderBy: [{ publishedAt: "desc" }],
    // Le score est calculé en mémoire ; on borne l'échantillon pour ne pas
    // charger tout le Journal sur un site qui aura mille articles.
    take: 60,
  });

  const summaries = rows.map((row) => toSummary(row, locale));
  const byId = new Map(summaries.map((summary) => [summary.id, summary]));

  const picked = pickRelated(
    {
      id: article.id,
      categoryId: article.category?.slug ?? "",
      tagIds: article.tags.map((tag) => tag.slug),
    },
    summaries.map((summary) => ({
      id: summary.id,
      categoryId: summary.category?.slug ?? "",
      tagIds: summary.tags.map((tag) => tag.slug),
      publishedAt: summary.publishedAt,
    })),
    limit,
  );

  return picked.map((entry) => byId.get(entry.id)).filter((entry): entry is ArticleSummary => Boolean(entry));
}

// ---- Routage statique et sitemap ----

export interface PublishedSlug {
  readonly slug: string;
  readonly updatedAt: Date;
  readonly publishedAt: Date;
}

export async function listPublishedSlugs(): Promise<PublishedSlug[]> {
  const rows = await prisma.article.findMany({
    where: publicWhere(new Date()),
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });
  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt ?? row.updatedAt,
  }));
}

/** Recherche plein texte simple, sur le même principe que la recherche produits. */
export async function searchArticles(locale: Locale, query: string): Promise<ArticleSummary[]> {
  const terms = query.trim();
  if (!terms) return [];

  const rows = await prisma.article.findMany({
    where: {
      ...publicWhere(new Date()),
      OR: [
        { title: { contains: terms, mode: "insensitive" } },
        { excerpt: { contains: terms, mode: "insensitive" } },
        { blocks: { contains: terms, mode: "insensitive" } },
        { tags: { some: { tag: { label: { contains: terms, mode: "insensitive" } } } } },
        { category: { label: { contains: terms, mode: "insensitive" } } },
      ],
    },
    include: listInclude,
    orderBy: [{ publishedAt: "desc" }],
    take: 50,
  });

  return rows.map((row) => toSummary(row, locale));
}
