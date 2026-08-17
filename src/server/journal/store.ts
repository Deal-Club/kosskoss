/**
 * Écritures et lectures d'administration du Journal.
 *
 * Tout ce qui touche la table `Article` en écriture passe ici, et une seule
 * fonction — `saveArticle` — porte la logique délicate :
 *
 *   - la résolution du slug, qui dépend des slugs déjà pris et du fait que
 *     l'article ait déjà été publié (gel après publication) ;
 *   - la redirection laissée derrière un slug changé ;
 *   - la réécriture des tags (ardoise propre, comme les variations produit) ;
 *   - l'instantané de version.
 *
 * Ces quatre opérations vont ensemble : un slug changé sans sa redirection
 * casse une URL indexée. Elles sont donc dans une seule transaction.
 */

import { prisma } from "@/server/prisma";
import { resolveSlug } from "@/lib/journal/slug";
import type { ArticleValues } from "@/lib/journal/input";
import type { ArticleStatus } from "@/types/journal";

// ---- Lecture pour l'administration ----

export interface AdminArticleRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: ArticleStatus;
  readonly featured: boolean;
  readonly viewCount: number;
  readonly readingMinutes: number;
  readonly coverImage: string;
  readonly categoryId: string | null;
  readonly categoryLabel: string;
  readonly authorId: string | null;
  readonly authorName: string;
  readonly tagCount: number;
  readonly publishedAt: Date | null;
  readonly scheduledAt: Date | null;
  readonly deletedAt: Date | null;
  readonly updatedAt: Date;
  readonly createdAt: Date;
}

const adminInclude = {
  category: { select: { label: true } },
  author: { select: { name: true } },
  _count: { select: { tags: true } },
} as const;

type AdminRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  viewCount: number;
  readingMinutes: number;
  coverImage: string;
  categoryId: string | null;
  authorId: string | null;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  deletedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  category: { label: string } | null;
  author: { name: string } | null;
  _count: { tags: number };
};

function toAdminRow(row: AdminRow): AdminArticleRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as ArticleStatus,
    featured: row.featured,
    viewCount: row.viewCount,
    readingMinutes: row.readingMinutes,
    coverImage: row.coverImage,
    categoryId: row.categoryId,
    categoryLabel: row.category?.label ?? "",
    authorId: row.authorId,
    authorName: row.author?.name ?? "",
    tagCount: row._count.tags,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    deletedAt: row.deletedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

/**
 * Articles du back-office.
 *
 * La corbeille est un écran séparé : mélanger les deux ferait réapparaître un
 * article jeté au milieu de la liste de travail.
 */
export async function listAdminArticles(options?: { trashed?: boolean }): Promise<AdminArticleRow[]> {
  const rows = await prisma.article.findMany({
    where: options?.trashed ? { deletedAt: { not: null } } : { deletedAt: null },
    include: adminInclude,
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(toAdminRow);
}

export async function countTrashedArticles(): Promise<number> {
  return prisma.article.count({ where: { deletedAt: { not: null } } });
}

export interface AdminArticleDetail extends AdminArticleRow {
  readonly titleEn: string;
  readonly excerpt: string;
  readonly excerptEn: string;
  readonly blocks: string;
  readonly blocksEn: string;
  readonly coverAlt: string;
  readonly coverAltEn: string;
  readonly categoryId: string | null;
  readonly authorId: string | null;
  readonly tagIds: string[];
  readonly metaTitle: string;
  readonly metaTitleEn: string;
  readonly metaDescription: string;
  readonly metaDescriptionEn: string;
  readonly focusKeyword: string;
  readonly canonicalUrl: string;
  readonly robotsNoindex: boolean;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogImage: string;
  readonly twitterTitle: string;
  readonly twitterDescription: string;
  readonly twitterImage: string;
  readonly commentsEnabled: boolean;
  /** E-mail du dernier administrateur ayant enregistré. */
  readonly updatedBy: string;
}

export async function getAdminArticle(id: string): Promise<AdminArticleDetail | null> {
  const row = await prisma.article.findUnique({
    where: { id },
    include: { ...adminInclude, tags: { select: { tagId: true } } },
  });
  if (!row) return null;

  return {
    ...toAdminRow(row),
    titleEn: row.titleEn,
    excerpt: row.excerpt,
    excerptEn: row.excerptEn,
    blocks: row.blocks,
    blocksEn: row.blocksEn,
    coverAlt: row.coverAlt,
    coverAltEn: row.coverAltEn,
    categoryId: row.categoryId,
    authorId: row.authorId,
    tagIds: row.tags.map((link) => link.tagId),
    metaTitle: row.metaTitle,
    metaTitleEn: row.metaTitleEn,
    metaDescription: row.metaDescription,
    metaDescriptionEn: row.metaDescriptionEn,
    focusKeyword: row.focusKeyword,
    canonicalUrl: row.canonicalUrl,
    robotsNoindex: row.robotsNoindex,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImage: row.ogImage,
    twitterTitle: row.twitterTitle,
    twitterDescription: row.twitterDescription,
    twitterImage: row.twitterImage,
    commentsEnabled: row.commentsEnabled,
    updatedBy: row.updatedBy,
  };
}

// ---- Écriture ----

/** Champs scalaires communs à la création et à la mise à jour. */
function scalarFields(values: ArticleValues, updatedBy: string) {
  return {
    title: values.title,
    titleEn: values.titleEn,
    excerpt: values.excerpt,
    excerptEn: values.excerptEn,
    blocks: values.blocks,
    blocksEn: values.blocksEn,
    coverImage: values.coverImage,
    coverAlt: values.coverAlt,
    coverAltEn: values.coverAltEn,
    categoryId: values.categoryId,
    authorId: values.authorId,
    status: values.status,
    publishedAt: values.publishedAt,
    scheduledAt: values.scheduledAt,
    featured: values.featured,
    readingMinutes: values.readingMinutes,
    metaTitle: values.metaTitle,
    metaTitleEn: values.metaTitleEn,
    metaDescription: values.metaDescription,
    metaDescriptionEn: values.metaDescriptionEn,
    focusKeyword: values.focusKeyword,
    canonicalUrl: values.canonicalUrl,
    robotsNoindex: values.robotsNoindex,
    ogTitle: values.ogTitle,
    ogDescription: values.ogDescription,
    ogImage: values.ogImage,
    twitterTitle: values.twitterTitle,
    twitterDescription: values.twitterDescription,
    twitterImage: values.twitterImage,
    commentsEnabled: values.commentsEnabled,
    updatedBy,
  };
}

export interface SaveResult {
  readonly id: string;
  readonly slug: string;
  /** Ancien slug redirigé, pour l'afficher à l'administrateur. */
  readonly redirectFrom: string | null;
}

/**
 * Crée ou met à jour un article, slug et redirection compris.
 *
 * `id` absent = création.
 */
export async function saveArticle(
  id: string | null,
  values: ArticleValues,
  updatedBy: string,
): Promise<SaveResult> {
  const existing = id
    ? await prisma.article.findUnique({
        where: { id },
        select: { id: true, slug: true, publishedAt: true, status: true },
      })
    : null;

  if (id && !existing) {
    throw new Error("Article introuvable.");
  }

  const taken = (await prisma.article.findMany({ select: { slug: true } })).map((row) => row.slug);

  // « Déjà publié une fois » et non « publié maintenant » : un article dépublié
  // garde une URL connue des moteurs, son slug reste gelé.
  const everPublished = Boolean(existing?.publishedAt);

  const { slug, redirectFrom } = resolveSlug({
    title: values.title,
    manualSlug: values.manualSlug,
    currentSlug: existing?.slug ?? "",
    everPublished,
    taken,
  });

  const data = scalarFields(values, updatedBy);

  const saved = await prisma.$transaction(async (tx) => {
    const article = existing
      ? await tx.article.update({ where: { id: existing.id }, data: { ...data, slug } })
      : await tx.article.create({ data: { ...data, slug } });

    // Tags : ardoise propre. Il n'y a pas de clé naturelle stable côté
    // formulaire, comparer ligne à ligne coûterait plus que tout réécrire.
    await tx.articleTagLink.deleteMany({ where: { articleId: article.id } });
    if (values.tagIds.length > 0) {
      await tx.articleTagLink.createMany({
        data: values.tagIds.map((tagId) => ({ articleId: article.id, tagId })),
        skipDuplicates: true,
      });
    }

    // Une adresse indexée ne disparaît jamais en silence.
    if (redirectFrom) {
      await tx.articleRedirect.upsert({
        where: { oldSlug: redirectFrom },
        update: { articleId: article.id },
        create: { oldSlug: redirectFrom, articleId: article.id },
      });
      // Le nouveau slug ne doit pas rester une redirection vers lui-même.
      await tx.articleRedirect.deleteMany({ where: { oldSlug: slug } });
    }

    await tx.articleRevision.create({
      data: {
        articleId: article.id,
        snapshot: JSON.stringify({ ...data, slug, tagIds: values.tagIds }),
        updatedBy,
      },
    });

    return article;
  });

  return { id: saved.id, slug: saved.slug, redirectFrom };
}

// ---- Corbeille et statuts ----

export async function trashArticles(ids: readonly string[]): Promise<number> {
  const result = await prisma.article.updateMany({
    where: { id: { in: [...ids] }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count;
}

export async function restoreArticles(ids: readonly string[]): Promise<number> {
  const result = await prisma.article.updateMany({
    where: { id: { in: [...ids] } },
    data: { deletedAt: null },
  });
  return result.count;
}

/**
 * Suppression définitive. Réservée au rôle `superadmin` — le contrôle est fait
 * dans la route `/api/admin/journal/bulk`, seule porte d'entrée.
 * Les liens, versions, commentaires et vues partent en cascade.
 *
 * Seuls les articles DÉJÀ à la corbeille sont concernés : on ne supprime jamais
 * définitivement quelque chose qui est encore dans la liste de travail.
 */
export async function purgeArticles(ids: readonly string[]): Promise<number> {
  const result = await prisma.article.deleteMany({
    where: { id: { in: [...ids] }, deletedAt: { not: null } },
  });
  return result.count;
}

/**
 * Changement de statut groupé.
 *
 * La date de publication est posée ici plutôt que laissée à l'appelant : un
 * article publié sans date ne sortirait jamais, `isPubliclyVisible` l'exige.
 */
export async function setArticlesStatus(
  ids: readonly string[],
  status: ArticleStatus,
  now: Date = new Date(),
): Promise<number> {
  if (status === "published") {
    // Ceux qui n'ont jamais été publiés reçoivent la date du jour ; les autres
    // gardent la leur, pour ne pas remonter artificiellement en tête de liste.
    await prisma.article.updateMany({
      where: { id: { in: [...ids] }, publishedAt: null },
      data: { publishedAt: now },
    });
    const result = await prisma.article.updateMany({
      where: { id: { in: [...ids] } },
      data: { status, scheduledAt: null },
    });
    return result.count;
  }

  if (status === "draft") {
    const result = await prisma.article.updateMany({
      where: { id: { in: [...ids] } },
      data: { status, publishedAt: null, scheduledAt: null },
    });
    return result.count;
  }

  const result = await prisma.article.updateMany({
    where: { id: { in: [...ids] } },
    data: { status, scheduledAt: null },
  });
  return result.count;
}

export async function setArticleFeatured(id: string, featured: boolean): Promise<void> {
  await prisma.article.update({ where: { id }, data: { featured } });
}
