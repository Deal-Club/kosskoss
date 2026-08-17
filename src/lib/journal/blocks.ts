/**
 * Normalisation et contrôle des blocs d'un article.
 *
 * Ce module ne connaît ni la base ni Next : il transforme ce que le navigateur
 * envoie en contenu valide, ou explique pourquoi il refuse. Le contrôle est
 * refait ici même si l'éditeur l'a déjà fait — une requête peut arriver sans
 * passer par l'éditeur. C'est le même parti pris que `normalizeLegalPage()` et
 * `parseProductInput()`.
 *
 * Deux garde-fous méritent d'être expliqués :
 *
 *  - Les adresses passent par `isSafeHref()` : ce qui n'est pas un chemin
 *    interne, une URL http(s), un `mailto:` ou un `tel:` est REFUSÉ, pas
 *    « nettoyé ». Un lien qu'on ne comprend pas ne devient jamais cliquable.
 *
 *  - Une vidéo se décrit par un identifiant, jamais par une URL. Accepter une
 *    URL reviendrait à laisser un rédacteur choisir le domaine intégré dans une
 *    iframe, c'est-à-dire à rouvrir exactement ce que le rendu sans HTML ferme.
 *
 * Les bornes de longueur ne protègent pas d'une attaque mais d'une erreur : un
 * copier-coller malheureux ne doit pas remplir une colonne de plusieurs
 * mégaoctets ni rendre un article illisible.
 */

import { isSafeHref } from "@/lib/richText";
import { slugify } from "@/lib/slugify";
import {
  CALLOUT_TONES,
  VIDEO_PROVIDERS,
  type CalloutTone,
  type JournalBlock,
  type VideoProvider,
} from "@/types/journal";

export const BLOCK_LIMITS = {
  /** Nombre de blocs dans un article. */
  blocks: 300,
  /** Texte courant d'un bloc (paragraphe, encadré, réponse de FAQ). */
  text: 20_000,
  /** Titre, légende, libellé de bouton, question de FAQ. */
  short: 300,
  listItems: 200,
  listItem: 2_000,
  galleryItems: 24,
  statItems: 8,
  faqItems: 50,
  tableColumns: 8,
  tableRows: 200,
  tableCell: 600,
  productSlugs: 6,
} as const;

export type NormalizeBlocksResult =
  | { readonly ok: true; readonly blocks: JournalBlock[] }
  | { readonly ok: false; readonly error: string };

type BlockResult =
  | { readonly ok: true; readonly block: JournalBlock }
  | { readonly ok: false; readonly error: string };

// ---- Petits utilitaires ----

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Nettoie les fins de ligne et les espaces en fin de ligne, sans toucher au reste. */
function tidy(value: unknown): string {
  return asString(value).replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

/** Texte sur une seule ligne : titres, légendes, libellés. */
function oneLine(value: unknown): string {
  return asString(value).replace(/\s+/g, " ").trim();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function tooLong(value: string, limit: number, what: string): string | null {
  return value.length > limit ? `${what} dépasse ${limit} caractères.` : null;
}

/**
 * Source d'image acceptée : un chemin interne (« /images/… », « /uploads/… »)
 * ou une URL https. Tout le reste — `javascript:`, `data:`, protocole relatif —
 * est refusé, comme pour les liens.
 */
export function isSafeImageSource(value: string): boolean {
  const source = value.trim();
  if (!source || /[\s<>"']/.test(source)) return false;
  if (source.startsWith("//")) return false;
  if (source.startsWith("/")) return true;
  return /^https:\/\//i.test(source);
}

/** Identifiant de vidéo : le jeu de caractères commun à YouTube et Vimeo. */
function isVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isCalloutTone(value: unknown): value is CalloutTone {
  return typeof value === "string" && (CALLOUT_TONES as readonly string[]).includes(value);
}

function isVideoProvider(value: unknown): value is VideoProvider {
  return typeof value === "string" && (VIDEO_PROVIDERS as readonly string[]).includes(value);
}

// ---- Normalisation d'un bloc ----

function normalizeBlock(raw: unknown): BlockResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Un bloc illisible a été reçu." };
  }
  const input = raw as Record<string, unknown>;
  const kind = asString(input.kind);

  switch (kind) {
    case "paragraph": {
      const text = tidy(input.text);
      const error = tooLong(text, BLOCK_LIMITS.text, "Le texte d'un paragraphe");
      if (error) return { ok: false, error };
      if (!text) return { ok: false, error: "Un paragraphe vide ne peut pas être enregistré." };
      return { ok: true, block: { kind: "paragraph", text } };
    }

    case "heading": {
      const text = oneLine(input.text);
      const error = tooLong(text, BLOCK_LIMITS.short, "Un titre");
      if (error) return { ok: false, error };
      if (!text) return { ok: false, error: "Un titre vide ne peut pas être enregistré." };
      // Seuls deux niveaux existent : le H1 est le titre de l'article.
      const level = input.level === 3 || input.level === "3" ? 3 : 2;
      return { ok: true, block: { kind: "heading", level, text } };
    }

    case "list": {
      const items = asArray(input.items).map(tidy).filter(Boolean);
      if (items.length === 0) return { ok: false, error: "Une liste sans entrée ne sert à rien." };
      if (items.length > BLOCK_LIMITS.listItems) {
        return { ok: false, error: `Une liste dépasse ${BLOCK_LIMITS.listItems} entrées.` };
      }
      for (const item of items) {
        const error = tooLong(item, BLOCK_LIMITS.listItem, "Une entrée de liste");
        if (error) return { ok: false, error };
      }
      return { ok: true, block: { kind: "list", ordered: input.ordered === true, items } };
    }

    case "quote": {
      const text = tidy(input.text);
      const error = tooLong(text, BLOCK_LIMITS.text, "Une citation");
      if (error) return { ok: false, error };
      if (!text) return { ok: false, error: "Une citation vide ne peut pas être enregistrée." };
      return { ok: true, block: { kind: "quote", text, attribution: oneLine(input.attribution) } };
    }

    case "image": {
      const src = oneLine(input.src);
      if (!isSafeImageSource(src)) {
        return { ok: false, error: "L'adresse de l'image n'est pas valide." };
      }
      const alt = oneLine(input.alt);
      if (!alt) {
        return { ok: false, error: "Chaque image doit porter un texte alternatif." };
      }
      const error = tooLong(alt, BLOCK_LIMITS.short, "Un texte alternatif");
      if (error) return { ok: false, error };
      return { ok: true, block: { kind: "image", src, alt, caption: oneLine(input.caption) } };
    }

    case "gallery": {
      const items = asArray(input.items)
        .map((entry) => {
          const item = (entry ?? {}) as Record<string, unknown>;
          return { src: oneLine(item.src), alt: oneLine(item.alt) };
        })
        .filter((item) => item.src.length > 0);
      if (items.length === 0) return { ok: false, error: "Une galerie doit contenir au moins une image." };
      if (items.length > BLOCK_LIMITS.galleryItems) {
        return { ok: false, error: `Une galerie dépasse ${BLOCK_LIMITS.galleryItems} images.` };
      }
      for (const item of items) {
        if (!isSafeImageSource(item.src)) {
          return { ok: false, error: "L'adresse d'une image de la galerie n'est pas valide." };
        }
        if (!item.alt) {
          return { ok: false, error: "Chaque image doit porter un texte alternatif." };
        }
      }
      return { ok: true, block: { kind: "gallery", items } };
    }

    case "video": {
      if (!isVideoProvider(input.provider)) {
        return { ok: false, error: `Fournisseur vidéo inconnu : « ${asString(input.provider)} ».` };
      }
      const videoId = oneLine(input.videoId);
      if (!isVideoId(videoId)) {
        return {
          ok: false,
          error: "L'identifiant de la vidéo n'est pas valide : indiquez l'identifiant seul, pas l'adresse complète.",
        };
      }
      return { ok: true, block: { kind: "video", provider: input.provider, videoId, title: oneLine(input.title) } };
    }

    case "callout": {
      const text = tidy(input.text);
      const error = tooLong(text, BLOCK_LIMITS.text, "Un encadré");
      if (error) return { ok: false, error };
      if (!text) return { ok: false, error: "Un encadré vide ne peut pas être enregistré." };
      // Une tonalité inconnue n'est pas une erreur : l'encadré reste utile,
      // il prend simplement l'habillage neutre.
      const tone: CalloutTone = isCalloutTone(input.tone) ? input.tone : "info";
      return { ok: true, block: { kind: "callout", tone, title: oneLine(input.title), text } };
    }

    case "stats": {
      const items = asArray(input.items)
        .map((entry) => {
          const item = (entry ?? {}) as Record<string, unknown>;
          return { value: oneLine(item.value), label: oneLine(item.label) };
        })
        .filter((item) => item.value.length > 0 || item.label.length > 0);
      if (items.length === 0) return { ok: false, error: "Un bloc de chiffres doit contenir au moins une entrée." };
      if (items.length > BLOCK_LIMITS.statItems) {
        return { ok: false, error: `Un bloc de chiffres dépasse ${BLOCK_LIMITS.statItems} entrées.` };
      }
      return { ok: true, block: { kind: "stats", items } };
    }

    case "cta": {
      const href = oneLine(input.href);
      if (!isSafeHref(href)) {
        return { ok: false, error: "L'adresse du lien de l'appel à l'action n'est pas autorisée." };
      }
      const label = oneLine(input.label);
      if (!label) return { ok: false, error: "Un appel à l'action doit porter un libellé de bouton." };
      return {
        ok: true,
        block: { kind: "cta", title: oneLine(input.title), text: tidy(input.text), href, label },
      };
    }

    case "productCard": {
      // Les produits sont cités par slug et résolus au rendu : un prix recopié
      // se désaligne du catalogue au premier changement de tarif.
      const slugs = [
        ...new Set(
          asArray(input.slugs)
            .map((value) => slugify(asString(value)))
            .filter(Boolean),
        ),
      ];
      if (slugs.length === 0) {
        return { ok: false, error: "Un bloc produits doit citer au moins un produit." };
      }
      if (slugs.length > BLOCK_LIMITS.productSlugs) {
        return { ok: false, error: `Un bloc produits dépasse ${BLOCK_LIMITS.productSlugs} références.` };
      }
      return { ok: true, block: { kind: "productCard", title: oneLine(input.title), slugs } };
    }

    case "newsletter": {
      return {
        ok: true,
        block: { kind: "newsletter", title: oneLine(input.title), text: tidy(input.text) },
      };
    }

    case "faq": {
      const items = asArray(input.items)
        .map((entry) => {
          const item = (entry ?? {}) as Record<string, unknown>;
          return { question: oneLine(item.question), answer: tidy(item.answer) };
        })
        .filter((item) => item.question.length > 0 && item.answer.length > 0);
      if (items.length === 0) {
        return { ok: false, error: "Une FAQ doit contenir au moins une question et sa réponse." };
      }
      if (items.length > BLOCK_LIMITS.faqItems) {
        return { ok: false, error: `Une FAQ dépasse ${BLOCK_LIMITS.faqItems} questions.` };
      }
      for (const item of items) {
        const error =
          tooLong(item.question, BLOCK_LIMITS.short, "Une question") ??
          tooLong(item.answer, BLOCK_LIMITS.text, "Une réponse");
        if (error) return { ok: false, error };
      }
      return { ok: true, block: { kind: "faq", items } };
    }

    case "table": {
      const headers = asArray(input.headers).map(oneLine);
      if (headers.length === 0) return { ok: false, error: "Un tableau doit avoir au moins une colonne." };
      if (headers.length > BLOCK_LIMITS.tableColumns) {
        return { ok: false, error: `Un tableau dépasse ${BLOCK_LIMITS.tableColumns} colonnes.` };
      }
      const rawRows = asArray(input.rows);
      if (rawRows.length > BLOCK_LIMITS.tableRows) {
        return { ok: false, error: `Un tableau dépasse ${BLOCK_LIMITS.tableRows} lignes.` };
      }
      // Une ligne trop courte est complétée, une ligne trop longue est tronquée :
      // un tableau bancal casse la mise en page, il ne doit pas franchir la base.
      const rows = rawRows.map((row) => {
        const cells = asArray(row).map(oneLine);
        return headers.map((_, index) => cells[index] ?? "");
      });
      for (const row of rows) {
        for (const cell of row) {
          const error = tooLong(cell, BLOCK_LIMITS.tableCell, "Une cellule");
          if (error) return { ok: false, error };
        }
      }
      return { ok: true, block: { kind: "table", headers, rows } };
    }

    case "divider":
      return { ok: true, block: { kind: "divider" } };

    default:
      return { ok: false, error: `Bloc inconnu : « ${kind || "sans type"} ».` };
  }
}

// ---- API publique ----

/** Contrôle strict, appliqué à toute écriture. */
export function normalizeBlocks(raw: unknown): NormalizeBlocksResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Le contenu doit être une liste de blocs." };
  }
  if (raw.length > BLOCK_LIMITS.blocks) {
    return { ok: false, error: `L'article dépasse ${BLOCK_LIMITS.blocks} blocs.` };
  }

  const blocks: JournalBlock[] = [];
  for (const [index, entry] of raw.entries()) {
    const result = normalizeBlock(entry);
    if (!result.ok) {
      return { ok: false, error: `Bloc ${index + 1} : ${result.error}` };
    }
    blocks.push(result.block);
  }
  return { ok: true, blocks };
}

/**
 * Lecture tolérante de ce qui est déjà en base.
 *
 * Un bloc devenu inconnu — type retiré dans une version ultérieure, ligne
 * abîmée — est ignoré au lieu de faire échouer la page. Un article publié doit
 * survivre au retrait d'un type de bloc ; perdre un encadré est acceptable,
 * rendre une page blanche ne l'est pas.
 */
export function parseStoredBlocks(json: string): JournalBlock[] {
  if (!json.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const blocks: JournalBlock[] = [];
  for (const entry of parsed) {
    const result = normalizeBlock(entry);
    if (result.ok) blocks.push(result.block);
  }
  return blocks;
}

export function serializeBlocks(blocks: readonly JournalBlock[]): string {
  return JSON.stringify(blocks);
}
