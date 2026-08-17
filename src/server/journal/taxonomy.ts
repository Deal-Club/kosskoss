/**
 * Catégories, tags et auteurs du Journal.
 *
 * Les compteurs d'articles publiés ne sont pas décoratifs : ce sont eux qui
 * décident de l'indexation. Une catégorie sans article et un tag utilisé une
 * seule fois créent des pages vides, c'est-à-dire de la dette de référencement
 * plutôt que du gain. Le sitemap s'appuie donc sur `publishedCount`.
 */

import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";
import type { Locale } from "@/i18n/routing";

/** Seuil d'indexation d'un tag : en dessous, la page existe mais reste hors sitemap. */
export const TAG_INDEX_THRESHOLD = 3;

function pick(french: string, english: string, locale: Locale): string {
  if (locale !== "en") return french;
  return english.trim() || french;
}

const PUBLISHED_FILTER = {
  deletedAt: null,
  status: "published",
  publishedAt: { not: null },
} as const;

// ---- Catégories ----

export interface CategoryView {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  readonly description: string;
  readonly image: string;
  readonly parentId: string | null;
  readonly position: number;
  readonly active: boolean;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly publishedCount: number;
}

export async function listCategories(locale: Locale = "fr"): Promise<CategoryView[]> {
  const rows = await prisma.articleCategory.findMany({
    orderBy: [{ position: "asc" }, { label: "asc" }],
    include: { _count: { select: { articles: { where: PUBLISHED_FILTER } } } },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: pick(row.label, row.labelEn, locale),
    description: pick(row.description, row.descriptionEn, locale),
    image: row.image,
    parentId: row.parentId,
    position: row.position,
    active: row.active,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    publishedCount: row._count.articles,
  }));
}

/** Catégories visibles sur la boutique : actives et non vides. */
export async function listPublicCategories(locale: Locale): Promise<CategoryView[]> {
  const all = await listCategories(locale);
  return all.filter((category) => category.active && category.publishedCount > 0);
}

export async function getCategoryBySlug(slug: string, locale: Locale): Promise<CategoryView | null> {
  const all = await listCategories(locale);
  return all.find((category) => category.slug === slug && category.active) ?? null;
}

export interface CategoryInput {
  readonly label: string;
  readonly labelEn: string;
  readonly description: string;
  readonly descriptionEn: string;
  readonly image: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly parentId: string | null;
  readonly position: number;
  readonly active: boolean;
}

async function freeSlug(base: string, table: "category" | "tag" | "author", ownId?: string): Promise<string> {
  const start = slugify(base) || "sans-nom";
  const existing =
    table === "category"
      ? await prisma.articleCategory.findMany({ select: { id: true, slug: true } })
      : table === "tag"
        ? await prisma.articleTag.findMany({ select: { id: true, slug: true } })
        : await prisma.articleAuthor.findMany({ select: { id: true, slug: true } });

  const taken = new Set(existing.filter((row) => row.id !== ownId).map((row) => row.slug));
  if (!taken.has(start)) return start;

  let suffix = 2;
  while (taken.has(`${start}-${suffix}`)) suffix += 1;
  return `${start}-${suffix}`;
}

export async function saveCategory(id: string | null, input: CategoryInput): Promise<string> {
  const slug = await freeSlug(input.label, "category", id ?? undefined);
  const data = {
    slug,
    label: input.label,
    labelEn: input.labelEn,
    description: input.description,
    descriptionEn: input.descriptionEn,
    image: input.image,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    // Une catégorie ne peut pas être sa propre parente.
    parentId: input.parentId && input.parentId !== id ? input.parentId : null,
    position: input.position,
    active: input.active,
  };

  const row = id
    ? await prisma.articleCategory.update({ where: { id }, data })
    : await prisma.articleCategory.create({ data });
  return row.id;
}

/**
 * Une catégorie supprimée détache ses articles (`onDelete: SetNull`) au lieu de
 * les emporter. Perdre un article parce qu'on range mal serait absurde.
 */
export async function deleteCategory(id: string): Promise<void> {
  await prisma.articleCategory.delete({ where: { id } });
}

// ---- Tags ----

export interface TagView {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  readonly publishedCount: number;
}

export async function listTags(locale: Locale = "fr"): Promise<TagView[]> {
  const rows = await prisma.articleTag.findMany({
    orderBy: { label: "asc" },
    include: { _count: { select: { articles: { where: { article: PUBLISHED_FILTER } } } } },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: pick(row.label, row.labelEn, locale),
    publishedCount: row._count.articles,
  }));
}

export async function getTagBySlug(slug: string, locale: Locale): Promise<TagView | null> {
  const all = await listTags(locale);
  return all.find((tag) => tag.slug === slug) ?? null;
}

export async function saveTag(id: string | null, label: string, labelEn: string): Promise<string> {
  const slug = await freeSlug(label, "tag", id ?? undefined);
  const row = id
    ? await prisma.articleTag.update({ where: { id }, data: { slug, label, labelEn } })
    : await prisma.articleTag.create({ data: { slug, label, labelEn } });
  return row.id;
}

export async function deleteTag(id: string): Promise<void> {
  await prisma.articleTag.delete({ where: { id } });
}

// ---- Auteurs ----

export interface AuthorView {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly avatar: string;
  readonly socials: Record<string, string>;
  readonly active: boolean;
  readonly publishedCount: number;
}

/** Les réseaux sociaux sont stockés en JSON : une ligne abîmée ne casse rien. */
function parseSocials(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, url]) => typeof url === "string" && url.trim().length > 0)
        .map(([network, url]) => [network, String(url).trim()]),
    );
  } catch {
    return {};
  }
}

export async function listAuthors(locale: Locale = "fr"): Promise<AuthorView[]> {
  const rows = await prisma.articleAuthor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: { where: PUBLISHED_FILTER } } } },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: pick(row.role, row.roleEn, locale),
    bio: pick(row.bio, row.bioEn, locale),
    avatar: row.avatar,
    socials: parseSocials(row.socials),
    active: row.active,
    publishedCount: row._count.articles,
  }));
}

export async function getAuthorBySlug(slug: string, locale: Locale): Promise<AuthorView | null> {
  const all = await listAuthors(locale);
  return all.find((author) => author.slug === slug && author.active) ?? null;
}

export interface AuthorInput {
  readonly name: string;
  readonly role: string;
  readonly roleEn: string;
  readonly bio: string;
  readonly bioEn: string;
  readonly avatar: string;
  readonly socials: Record<string, string>;
  readonly active: boolean;
}

export async function saveAuthor(id: string | null, input: AuthorInput): Promise<string> {
  const slug = await freeSlug(input.name, "author", id ?? undefined);
  const data = {
    slug,
    name: input.name,
    role: input.role,
    roleEn: input.roleEn,
    bio: input.bio,
    bioEn: input.bioEn,
    avatar: input.avatar,
    socials: JSON.stringify(input.socials),
    active: input.active,
  };

  const row = id
    ? await prisma.articleAuthor.update({ where: { id }, data })
    : await prisma.articleAuthor.create({ data });
  return row.id;
}

export async function deleteAuthor(id: string): Promise<void> {
  await prisma.articleAuthor.delete({ where: { id } });
}
