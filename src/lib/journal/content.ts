/**
 * Dérivés du contenu d'un article : texte brut, chapeau, temps de lecture,
 * sommaire.
 *
 * Tout part des blocs, jamais d'une chaîne de HTML. C'est ce qui permet à ces
 * fonctions d'être exactes plutôt qu'approximatives : le sommaire connaît les
 * titres au lieu de les deviner par expression régulière, et le chapeau retire
 * les marques de formatage avant de couper, au lieu de trancher au milieu d'un
 * `**gras**`.
 */

import { stripMarks } from "@/lib/richText";
import { slugify } from "@/lib/slugify";
import type { JournalBlock, TocEntry } from "@/types/journal";

/** Nombre de mots lus par minute. Moyenne courante pour une lecture d'écran. */
export const WORDS_PER_MINUTE = 200;

/** Longueur cible d'un chapeau généré automatiquement. */
export const EXCERPT_LENGTH = 200;

/** Texte lisible porté par un bloc, marques comprises. */
function blockText(block: JournalBlock): string {
  switch (block.kind) {
    case "paragraph":
    case "quote":
      return block.text;
    case "heading":
      return block.text;
    case "list":
      return block.items.join(" ");
    case "image":
      // L'adresse n'est pas du texte ; le texte alternatif et la légende, si.
      return [block.alt, block.caption].filter(Boolean).join(" ");
    case "gallery":
      return block.items.map((item) => item.alt).filter(Boolean).join(" ");
    case "video":
      return block.title;
    case "callout":
      return [block.title, block.text].filter(Boolean).join(" ");
    case "stats":
      return block.items.map((item) => `${item.value} ${item.label}`).join(" ");
    case "cta":
      return [block.title, block.text, block.label].filter(Boolean).join(" ");
    case "productCard":
      return block.title;
    case "newsletter":
      return [block.title, block.text].filter(Boolean).join(" ");
    case "faq":
      return block.items.map((item) => `${item.question} ${item.answer}`).join(" ");
    case "table":
      return [block.headers.join(" "), ...block.rows.map((row) => row.join(" "))].join(" ");
    case "divider":
      return "";
  }
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Contenu entier en texte nu : recherche, temps de lecture, métadonnées. */
export function blocksToPlainText(blocks: readonly JournalBlock[]): string {
  const raw = blocks.map(blockText).filter(Boolean).join(" ");
  return collapse(stripMarks(raw));
}

/**
 * Chapeau généré à partir des seuls paragraphes.
 *
 * Les titres sont écartés volontairement : un chapeau qui commence par
 * « Nettoyer Hydrater » ne dit rien de l'article. La coupe se fait sur un mot
 * entier, marques retirées au préalable.
 */
export function autoExcerpt(
  blocks: readonly JournalBlock[],
  maxChars: number = EXCERPT_LENGTH,
): string {
  const paragraphs = blocks.filter((block) => block.kind === "paragraph").map((block) => block.text);
  const text = collapse(stripMarks(paragraphs.join(" ")));
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–—-]+$/, "");
  return `${kept}…`;
}

/** Temps de lecture en minutes, jamais inférieur à une. */
export function readingMinutes(
  blocks: readonly JournalBlock[],
  wordsPerMinute: number = WORDS_PER_MINUTE,
): number {
  const words = blocksToPlainText(blocks).split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Sommaire construit sur les titres.
 *
 * Les ancres doivent rester uniques : deux sections « Conseil » dans un même
 * article produiraient deux `id` identiques, et le lien du sommaire renverrait
 * toujours vers la première.
 */
export function tableOfContents(blocks: readonly JournalBlock[]): TocEntry[] {
  const used = new Map<string, number>();
  const entries: TocEntry[] = [];

  for (const [index, block] of blocks.entries()) {
    if (block.kind !== "heading") continue;

    const text = stripMarks(block.text).trim();
    const base = slugify(text) || `section-${index + 1}`;
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);

    entries.push({
      id: seen === 0 ? base : `${base}-${seen + 1}`,
      level: block.level,
      text,
    });
  }

  return entries;
}
