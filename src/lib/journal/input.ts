/**
 * Normalisation d'un article soumis par le back-office.
 *
 * Unique porte d'entrée en écriture. Comme `parseProductInput` et
 * `normalizeLegalPage`, ce module ne connaît ni Prisma ni Next : il transforme
 * ce que le navigateur envoie en valeurs prêtes à écrire, ou explique pourquoi
 * il refuse. Le formulaire fait déjà ces contrôles ; ils sont refaits ici parce
 * qu'une requête peut arriver sans passer par le formulaire.
 *
 * Le slug ne se décide PAS ici : il dépend de ce qui est déjà en base (autres
 * slugs, article déjà publié ou non). C'est `resolveSlug` qui s'en charge, à
 * l'étage au-dessus.
 */

import { isArticleStatus, type ArticleStatus } from "@/types/journal";
import { autoExcerpt, readingMinutes } from "./content";
import { isSafeImageSource, normalizeBlocks, serializeBlocks } from "./blocks";
import { resolvePublication } from "./status";

export const ARTICLE_LIMITS = {
  title: 250,
  excerpt: 600,
  metaTitle: 250,
  metaDescription: 600,
  focusKeyword: 120,
  url: 2_000,
  alt: 300,
  tags: 30,
} as const;

export interface ArticleValues {
  readonly title: string;
  readonly titleEn: string;
  /** Slug demandé, vide si l'administrateur n'y a pas touché. */
  readonly manualSlug: string;
  readonly excerpt: string;
  readonly excerptEn: string;
  readonly blocks: string;
  readonly blocksEn: string;
  readonly coverImage: string;
  readonly coverAlt: string;
  readonly coverAltEn: string;
  readonly categoryId: string | null;
  readonly authorId: string | null;
  readonly tagIds: string[];
  readonly status: ArticleStatus;
  readonly publishedAt: Date | null;
  readonly scheduledAt: Date | null;
  readonly featured: boolean;
  readonly readingMinutes: number;
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
}

export type ParseArticleResult =
  | { readonly ok: true; readonly values: ArticleValues }
  | { readonly ok: false; readonly error: string };

// ---- Utilitaires ----

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function oneLine(value: unknown): string {
  return asString(value).replace(/\s+/g, " ").trim();
}

function multiLine(value: unknown): string {
  return asString(value).replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

/** Booléen strict : « oui », « 1 » ou une chaîne non vide ne valent pas `true`. */
function asBoolean(value: unknown): boolean {
  return value === true;
}

function nullableId(value: unknown): string | null {
  const id = oneLine(value);
  return id.length > 0 ? id : null;
}

function tooLong(value: string, limit: number, what: string): string | null {
  return value.length > limit ? `${what} dépasse ${limit} caractères.` : null;
}

/** Date ISO, ou `undefined` si la valeur est absente, ou `null` si illisible. */
function parseDate(value: unknown): Date | null | undefined {
  const raw = oneLine(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---- Normalisation ----

export function parseArticleInput(raw: unknown, now: Date = new Date()): ParseArticleResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Contenu illisible." };
  }
  const input = raw as Record<string, unknown>;

  // --- Titre ---
  const title = oneLine(input.title);
  if (!title) return { ok: false, error: "Le titre de l'article est obligatoire." };
  const titleError = tooLong(title, ARTICLE_LIMITS.title, "Le titre");
  if (titleError) return { ok: false, error: titleError };

  // --- Contenu ---
  const french = normalizeBlocks(input.blocks ?? []);
  if (!french.ok) return { ok: false, error: french.error };

  // La version anglaise est facultative : une liste vide signifie « pas encore
  // traduit », et la boutique anglaise retombera sur le français.
  const englishRaw = Array.isArray(input.blocksEn) ? input.blocksEn : [];
  const english = normalizeBlocks(englishRaw);
  if (!english.ok) return { ok: false, error: `Version anglaise — ${english.error}` };

  // --- Chapeau ---
  // Généré depuis les paragraphes s'il est laissé vide : jamais une troncature
  // brutale du contenu, les marques sont retirées avant la coupe.
  const excerpt = multiLine(input.excerpt) || autoExcerpt(french.blocks);
  const excerptError = tooLong(excerpt, ARTICLE_LIMITS.excerpt, "Le chapeau");
  if (excerptError) return { ok: false, error: excerptError };

  const excerptEn = multiLine(input.excerptEn) || (english.blocks.length > 0 ? autoExcerpt(english.blocks) : "");

  // --- Couverture ---
  const coverImage = oneLine(input.coverImage);
  if (coverImage && !isSafeImageSource(coverImage)) {
    return { ok: false, error: "L'adresse de l'image de couverture n'est pas valide." };
  }
  const coverAlt = oneLine(input.coverAlt);
  if (coverImage && !coverAlt) {
    return { ok: false, error: "L'image de couverture doit porter un texte alternatif." };
  }
  const coverAltError = tooLong(coverAlt, ARTICLE_LIMITS.alt, "Le texte alternatif");
  if (coverAltError) return { ok: false, error: coverAltError };

  // --- Statut et dates ---
  const rawStatus = oneLine(input.status) || "draft";
  if (!isArticleStatus(rawStatus)) {
    return { ok: false, error: `Statut inconnu : « ${rawStatus} ».` };
  }

  const scheduledAt = parseDate(input.scheduledAt);
  if (scheduledAt === null) {
    return { ok: false, error: "La date de programmation est illisible." };
  }
  const publishedAt = parseDate(input.publishedAt);
  if (publishedAt === null) {
    return { ok: false, error: "La date de publication est illisible." };
  }
  if (rawStatus === "scheduled" && scheduledAt === undefined) {
    return { ok: false, error: "Un article programmé demande une date de publication." };
  }

  const publication = resolvePublication(
    {
      status: rawStatus,
      scheduledAt: scheduledAt ?? null,
      publishedAt: publishedAt ?? null,
    },
    now,
  );

  // --- SEO ---
  const metaTitle = oneLine(input.metaTitle);
  const metaDescription = multiLine(input.metaDescription);
  const canonicalUrl = oneLine(input.canonicalUrl);
  if (canonicalUrl && !/^https?:\/\/\S+$/i.test(canonicalUrl)) {
    return { ok: false, error: "L'URL canonique doit être une adresse http ou https complète." };
  }
  const ogImage = oneLine(input.ogImage);
  if (ogImage && !isSafeImageSource(ogImage)) {
    return { ok: false, error: "L'adresse de l'image Open Graph n'est pas valide." };
  }
  const twitterImage = oneLine(input.twitterImage);
  if (twitterImage && !isSafeImageSource(twitterImage)) {
    return { ok: false, error: "L'adresse de l'image Twitter n'est pas valide." };
  }

  const seoError =
    tooLong(metaTitle, ARTICLE_LIMITS.metaTitle, "Le meta title") ??
    tooLong(metaDescription, ARTICLE_LIMITS.metaDescription, "La meta description") ??
    tooLong(canonicalUrl, ARTICLE_LIMITS.url, "L'URL canonique");
  if (seoError) return { ok: false, error: seoError };

  // --- Tags ---
  const tagIds = [
    ...new Set((Array.isArray(input.tagIds) ? input.tagIds : []).map(oneLine).filter(Boolean)),
  ];
  if (tagIds.length > ARTICLE_LIMITS.tags) {
    return { ok: false, error: `Un article dépasse ${ARTICLE_LIMITS.tags} tags.` };
  }

  return {
    ok: true,
    values: {
      title,
      titleEn: oneLine(input.titleEn),
      manualSlug: oneLine(input.slug),
      excerpt,
      excerptEn,
      blocks: serializeBlocks(french.blocks),
      blocksEn: serializeBlocks(english.blocks),
      coverImage,
      coverAlt,
      coverAltEn: oneLine(input.coverAltEn),
      categoryId: nullableId(input.categoryId),
      authorId: nullableId(input.authorId),
      tagIds,
      status: publication.status,
      publishedAt: publication.publishedAt,
      scheduledAt: publication.scheduledAt,
      featured: asBoolean(input.featured),
      readingMinutes: readingMinutes(french.blocks),
      metaTitle,
      metaTitleEn: oneLine(input.metaTitleEn),
      metaDescription,
      metaDescriptionEn: multiLine(input.metaDescriptionEn),
      focusKeyword: oneLine(input.focusKeyword).slice(0, ARTICLE_LIMITS.focusKeyword),
      canonicalUrl,
      robotsNoindex: asBoolean(input.robotsNoindex),
      ogTitle: oneLine(input.ogTitle),
      ogDescription: multiLine(input.ogDescription),
      ogImage,
      twitterTitle: oneLine(input.twitterTitle),
      twitterDescription: multiLine(input.twitterDescription),
      twitterImage,
      commentsEnabled: asBoolean(input.commentsEnabled),
    },
  };
}
