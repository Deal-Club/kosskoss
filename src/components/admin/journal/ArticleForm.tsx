"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { BlockEditor } from "./BlockEditor";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { parseStoredBlocks } from "@/lib/journal/blocks";
import { autoExcerpt, readingMinutes } from "@/lib/journal/content";
import { resolveArticleSeo } from "@/lib/journal/seo";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUSES, type ArticleStatus, type JournalBlock } from "@/types/journal";
import type { AdminArticleDetail } from "@/server/journal/store";
import type { AuthorView, CategoryView, TagView } from "@/server/journal/taxonomy";

/**
 * Formulaire d'article.
 *
 * Il est découpé en sections repliables plutôt qu'en un seul mur de champs :
 * un article porte une quarantaine de propriétés, dont trente que le rédacteur
 * ne touche jamais. Seule la section « Contenu » est ouverte au chargement.
 *
 * Deux choses méritent une note :
 *
 *  - **L'aperçu SEO affiche les REPLIS en grisé.** Un champ vide n'est pas une
 *    balise absente : le titre de l'article sert de meta title, le chapeau sert
 *    de meta description. Le montrer évite qu'on remplisse par superstition.
 *
 *  - **L'enregistrement automatique ne concerne que les brouillons.** Sur un
 *    article publié, une sauvegarde silencieuse mettrait en ligne des phrases
 *    inachevées ; le bouton « Enregistrer » redevient le seul geste qui publie.
 */

const AUTOSAVE_DELAY_MS = 3_000;

const inputClass =
  "w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "block text-xs font-bold tracking-wide text-muted-foreground uppercase";

function Section({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-sm border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="text-sm font-bold text-foreground">{title}</span>
          {hint ? <span className="ml-2 text-xs text-muted-foreground">{hint}</span> : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="space-y-4 border-t border-border p-4">{children}</div> : null}
    </section>
  );
}

/** Valeur d'un champ `datetime-local` à partir d'une date ISO. */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export interface ArticleFormProps {
  article: AdminArticleDetail | null;
  categories: readonly CategoryView[];
  tags: readonly TagView[];
  authors: readonly AuthorView[];
}

export function ArticleForm({ article, categories, tags, authors }: ArticleFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(article?.slug));
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [blocks, setBlocks] = useState<JournalBlock[]>(() =>
    parseStoredBlocks(article?.blocks ?? "[]"),
  );

  const [titleEn, setTitleEn] = useState(article?.titleEn ?? "");
  const [excerptEn, setExcerptEn] = useState(article?.excerptEn ?? "");

  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? "draft");
  const [scheduledAt, setScheduledAt] = useState(
    toLocalInput(article?.scheduledAt ? article.scheduledAt.toString() : null),
  );

  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [authorId, setAuthorId] = useState(article?.authorId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(article?.tagIds ?? []);

  const [coverImage, setCoverImage] = useState(article?.coverImage ?? "");
  const [coverAlt, setCoverAlt] = useState(article?.coverAlt ?? "");
  const [ogImage, setOgImage] = useState(article?.ogImage ?? "");

  const [metaTitle, setMetaTitle] = useState(article?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(article?.metaDescription ?? "");
  const [focusKeyword, setFocusKeyword] = useState(article?.focusKeyword ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(article?.canonicalUrl ?? "");
  const [robotsNoindex, setRobotsNoindex] = useState(article?.robotsNoindex ?? false);
  const [ogTitle, setOgTitle] = useState(article?.ogTitle ?? "");
  const [ogDescription, setOgDescription] = useState(article?.ogDescription ?? "");

  const [featured, setFeatured] = useState(article?.featured ?? false);
  const [commentsEnabled, setCommentsEnabled] = useState(article?.commentsEnabled ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [autosaveNote, setAutosaveNote] = useState<string | null>(null);

  // Horodatage attendu par l'auto-enregistrement : refuse d'écraser si l'article
  // a bougé ailleurs entre-temps.
  const expectedUpdatedAt = useRef(article?.updatedAt?.toISOString() ?? "");

  // Tant que le slug n'a pas été touché à la main, il suit le titre. Une fois
  // l'article publié, le serveur le gèle de toute façon.
  const effectiveSlug = slugTouched ? slug : slugify(title);

  const derived = useMemo(
    () => ({
      excerpt: excerpt.trim() || autoExcerpt(blocks),
      minutes: readingMinutes(blocks),
    }),
    [excerpt, blocks],
  );

  const seoPreview = useMemo(
    () =>
      resolveArticleSeo(
        {
          title,
          excerpt: derived.excerpt,
          coverImage,
          metaTitle,
          metaDescription,
          ogTitle,
          ogDescription,
          ogImage,
          twitterTitle: "",
          twitterDescription: "",
          twitterImage: "",
          canonicalUrl,
          robotsNoindex,
        },
        { brandName: BRAND.name, canonical: `/journal/${effectiveSlug}` },
      ),
    [
      title,
      derived.excerpt,
      coverImage,
      metaTitle,
      metaDescription,
      ogTitle,
      ogDescription,
      ogImage,
      canonicalUrl,
      robotsNoindex,
      effectiveSlug,
    ],
  );

  /**
   * Corps envoyé au serveur.
   *
   * Volontairement une fonction simple, sans `useCallback` : le compilateur
   * React est actif sur ce projet et mémorise lui-même. Une liste de vingt-cinq
   * dépendances écrite à la main serait fausse à la première évolution du
   * formulaire — et le compilateur refuse d'ailleurs de la préserver.
   */
  function payload() {
    return {
      title,
      titleEn,
      slug: slugTouched ? slug : "",
      excerpt,
      excerptEn,
      blocks,
      blocksEn: [],
      coverImage,
      coverAlt,
      categoryId,
      authorId,
      tagIds,
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : "",
      publishedAt: article?.publishedAt ? article.publishedAt.toISOString() : "",
      featured,
      metaTitle,
      metaDescription,
      focusKeyword,
      canonicalUrl,
      robotsNoindex,
      ogTitle,
      ogDescription,
      ogImage,
      commentsEnabled,
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(
      article ? `/api/admin/journal/${article.id}` : "/api/admin/journal",
      {
        method: article ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      slug?: string;
      redirectFrom?: string | null;
      error?: string;
    };
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Échec de l'enregistrement.");
      return;
    }

    if (data.redirectFrom) {
      window.alert(
        `L'adresse a changé. L'ancienne (/journal/${data.redirectFrom}) redirige désormais vers la nouvelle : aucun lien partagé n'est cassé.`,
      );
    }

    if (article) {
      setSavedAt(new Date());
      router.refresh();
    } else if (data.id) {
      router.push(`/admin/journal/${data.id}`);
    }
  }

  // ---- Enregistrement automatique ----
  const isDraft = status === "draft" && Boolean(article);

  useEffect(() => {
    if (!isDraft || !article) return;

    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/journal/${article.id}/autosave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          blocks,
          expectedUpdatedAt: expectedUpdatedAt.current,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        savedAt?: string;
        error?: string;
        currentUpdatedAt?: string;
      };

      if (response.ok && data.savedAt) {
        expectedUpdatedAt.current = data.savedAt;
        setSavedAt(new Date(data.savedAt));
        setAutosaveNote(null);
      } else if (response.status === 409) {
        setAutosaveNote(
          data.error ?? "L'article a changé ailleurs : l'enregistrement automatique est suspendu.",
        );
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isDraft, article, title, excerpt, blocks]);

  function toggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id],
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* ---- Barre d'action ---- */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {title || "Nouvel article"}
          </p>
          <p className="text-xs text-muted-foreground">
            {derived.minutes} min de lecture
            {savedAt ? ` · enregistré à ${savedAt.toLocaleTimeString("fr-FR")}` : ""}
            {isDraft && !savedAt ? " · enregistrement automatique actif" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {article ? (
            <a
              href={`/admin/journal/${article.id}/apercu`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-sm font-bold text-foreground hover:border-primary"
            >
              Prévisualiser
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-sm border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {autosaveNote ? (
        <p role="status" className="rounded-sm border border-border bg-muted px-4 py-3 text-sm text-foreground">
          {autosaveNote}
        </p>
      ) : null}

      {/* ---- Contenu ---- */}
      <Section title="Contenu" defaultOpen>
        <label className="block">
          <span className={labelClass}>Titre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className={cn(inputClass, "mt-1 text-base")}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Adresse (slug)</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/journal/</span>
            <input
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className={inputClass}
            />
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            {article?.publishedAt
              ? "Article déjà publié : l'adresse est figée. La modifier créera une redirection depuis l'ancienne."
              : "Tant que l'article n'est pas publié, l'adresse suit le titre."}
          </span>
        </label>

        <label className="block">
          <span className={labelClass}>Chapeau</span>
          <textarea
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={3}
            placeholder={derived.excerpt}
            className={cn(inputClass, "mt-1")}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Laissé vide, il est généré à partir des premiers paragraphes.
          </span>
        </label>

        <div>
          <span className={labelClass}>Corps de l&apos;article</span>
          <div className="mt-2">
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>
        </div>
      </Section>

      {/* ---- Publication ---- */}
      <Section title="Publication" hint={ARTICLE_STATUS_LABELS[status]}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Statut</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ArticleStatus)}
              className={cn(inputClass, "mt-1")}
            >
              {ARTICLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {ARTICLE_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {status === "scheduled" ? (
            <label className="block">
              <span className={labelClass}>Date de publication</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className={cn(inputClass, "mt-1")}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Une date déjà passée publie l&apos;article immédiatement.
              </span>
            </label>
          ) : null}
        </div>

        {article?.publishedAt ? (
          <p className="text-xs text-muted-foreground">
            Première publication : {new Date(article.publishedAt).toLocaleString("fr-FR")}
          </p>
        ) : null}
      </Section>

      {/* ---- Organisation ---- */}
      <Section title="Organisation">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Rubrique</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={cn(inputClass, "mt-1")}
            >
              <option value="">— Aucune —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Auteur</span>
            <select
              value={authorId}
              onChange={(event) => setAuthorId(event.target.value)}
              className={cn(inputClass, "mt-1")}
            >
              <option value="">— Aucun —</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className={labelClass}>Tags</span>
          {tags.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun tag pour l&apos;instant. Créez-en depuis « Rubriques &amp; auteurs ».
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary",
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* ---- Média ---- */}
      <Section title="Média">
        <ImageUploadField
          label="Image de couverture"
          value={coverImage}
          onChange={setCoverImage}
          hint="Format paysage. Sert aussi d'image de partage si aucune image Open Graph n'est fournie."
        />
        <label className="block">
          <span className={labelClass}>Texte alternatif de la couverture</span>
          <input
            value={coverAlt}
            onChange={(event) => setCoverAlt(event.target.value)}
            className={cn(inputClass, "mt-1")}
            placeholder="Ce que montre l'image, pour qui ne la voit pas"
          />
        </label>
        <ImageUploadField
          label="Image de partage (Open Graph)"
          value={ogImage}
          onChange={setOgImage}
          hint="Facultative : la couverture est utilisée par défaut."
        />
      </Section>

      {/* ---- SEO ---- */}
      <Section title="Référencement">
        <div className="rounded-sm border border-border bg-muted p-4">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Aperçu dans les résultats de recherche
          </p>
          <p className="mt-2 truncate text-[13px] text-trust">{seoPreview.canonical}</p>
          <p className={cn("text-lg leading-snug", metaTitle ? "text-primary" : "text-primary/60")}>
            {seoPreview.title}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              metaDescription ? "text-foreground" : "text-muted-foreground italic",
            )}
          >
            {seoPreview.description || "Aucune description : renseignez un chapeau ou une meta description."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            En grisé : la valeur de repli, utilisée tant que le champ reste vide.
          </p>
        </div>

        <label className="block">
          <span className={labelClass}>Meta title ({metaTitle.length}/60 conseillés)</span>
          <input
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            className={cn(inputClass, "mt-1")}
            placeholder={seoPreview.title}
          />
        </label>

        <label className="block">
          <span className={labelClass}>
            Meta description ({metaDescription.length}/155 conseillés)
          </span>
          <textarea
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            rows={2}
            className={cn(inputClass, "mt-1")}
            placeholder={derived.excerpt}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Mot-clé principal</span>
            <input
              value={focusKeyword}
              onChange={(event) => setFocusKeyword(event.target.value)}
              className={cn(inputClass, "mt-1")}
            />
          </label>
          <label className="block">
            <span className={labelClass}>URL canonique</span>
            <input
              value={canonicalUrl}
              onChange={(event) => setCanonicalUrl(event.target.value)}
              className={cn(inputClass, "mt-1")}
              placeholder="Laisser vide sauf contenu republié"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Titre Open Graph</span>
            <input
              value={ogTitle}
              onChange={(event) => setOgTitle(event.target.value)}
              className={cn(inputClass, "mt-1")}
              placeholder={seoPreview.ogTitle}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Description Open Graph</span>
            <input
              value={ogDescription}
              onChange={(event) => setOgDescription(event.target.value)}
              className={cn(inputClass, "mt-1")}
              placeholder={seoPreview.ogDescription}
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={robotsNoindex}
            onChange={(event) => setRobotsNoindex(event.target.checked)}
            className="mt-1"
          />
          <span>
            Ne pas indexer cet article
            <span className="block text-xs text-muted-foreground">
              L&apos;article reste accessible par son adresse mais sort de l&apos;index des moteurs.
            </span>
          </span>
        </label>
      </Section>

      {/* ---- Options ---- */}
      <Section title="Options">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
            className="mt-1"
          />
          <span>
            Mettre à la une
            <span className="block text-xs text-muted-foreground">
              L&apos;article le plus récent parmi ceux à la une occupe la tête du Journal.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={commentsEnabled}
            onChange={(event) => setCommentsEnabled(event.target.checked)}
            className="mt-1"
          />
          <span>
            Autoriser les commentaires
            <span className="block text-xs text-muted-foreground">
              Sans effet aujourd&apos;hui : la table existe, l&apos;affichage n&apos;est pas ouvert.
            </span>
          </span>
        </label>
      </Section>

      {/* ---- Traduction anglaise ---- */}
      <Section title="Version anglaise" hint="facultative — vide = repli sur le français">
        <label className="block">
          <span className={labelClass}>Titre</span>
          <input
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            className={cn(inputClass, "mt-1")}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Chapeau</span>
          <textarea
            value={excerptEn}
            onChange={(event) => setExcerptEn(event.target.value)}
            rows={2}
            className={cn(inputClass, "mt-1")}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Le corps de l&apos;article n&apos;est pas encore traduisible depuis cet écran : la boutique
          anglaise affiche le contenu français tant qu&apos;aucune traduction n&apos;existe.
        </p>
      </Section>
    </form>
  );
}
