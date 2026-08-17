/**
 * Types du Journal — l'espace éditorial de KossKoss Select.
 *
 * Deux principes structurent ce fichier, et ils viennent du reste du dépôt :
 *
 *  1. Le contenu d'un article est un TABLEAU DE BLOCS, pas du HTML. Le texte
 *     porté par chaque bloc utilise les marques restreintes de
 *     `src/lib/richText.ts` (**gras**, *italique*, [texte](lien)) et n'est rendu
 *     que par le composant `<RichText />`. Aucun HTML n'est stocké, donc aucune
 *     balise collée dans le back-office ne peut s'exécuter chez un visiteur :
 *     l'injection est fermée par construction, pas par filtrage.
 *
 *  2. Les statuts sont des chaînes, pas un enum Prisma. Le schéma s'interdit
 *     les enums pour rester portable d'un moteur SQL à l'autre ; le type union
 *     ci-dessous rétablit la sûreté côté TypeScript.
 */

// ---- Cycle de vie ----

/**
 * `draft`      brouillon, invisible publiquement
 * `scheduled`  programmé, publié automatiquement à `scheduledAt`
 * `published`  visible
 * `archived`   conservé, retiré de la boutique et du sitemap
 *
 * La corbeille n'est PAS un statut : c'est `deletedAt`. Un article jeté garde
 * ainsi le statut qu'il avait, et le restaurer le remet exactement où il était.
 */
export const ARTICLE_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export function isArticleStatus(value: unknown): value is ArticleStatus {
  return typeof value === "string" && (ARTICLE_STATUSES as readonly string[]).includes(value);
}

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
};

// ---- Blocs de contenu ----

export const CALLOUT_TONES = ["info", "conseil", "avertissement"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

export const VIDEO_PROVIDERS = ["youtube", "vimeo"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

export interface GalleryItem {
  readonly src: string;
  readonly alt: string;
}

export interface StatItem {
  readonly value: string;
  readonly label: string;
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

/**
 * Union discriminée sur `kind`. Ajouter un bloc coûte : une entrée ici, un cas
 * dans `normalizeBlocks`, un composant de rendu. Rien d'autre.
 */
export type JournalBlock =
  // -- Texte --
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "heading"; readonly level: 2 | 3; readonly text: string }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly kind: "quote"; readonly text: string; readonly attribution: string }
  // -- Média --
  | { readonly kind: "image"; readonly src: string; readonly alt: string; readonly caption: string }
  | { readonly kind: "gallery"; readonly items: readonly GalleryItem[] }
  | {
      readonly kind: "video";
      readonly provider: VideoProvider;
      /** Identifiant seul, jamais une URL libre — voir `normalizeBlocks`. */
      readonly videoId: string;
      readonly title: string;
    }
  // -- Mise en avant --
  | {
      readonly kind: "callout";
      readonly tone: CalloutTone;
      readonly title: string;
      readonly text: string;
    }
  | { readonly kind: "stats"; readonly items: readonly StatItem[] }
  // -- Marketing --
  | { readonly kind: "cta"; readonly title: string; readonly text: string; readonly href: string; readonly label: string }
  | {
      readonly kind: "productCard";
      readonly title: string;
      /** Slugs produits, résolus au rendu : un prix recopié se désaligne. */
      readonly slugs: readonly string[];
    }
  | { readonly kind: "newsletter"; readonly title: string; readonly text: string }
  // -- Avancé --
  | { readonly kind: "faq"; readonly items: readonly FaqItem[] }
  | { readonly kind: "table"; readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] }
  | { readonly kind: "divider" };

export type BlockKind = JournalBlock["kind"];

export const BLOCK_KINDS: readonly BlockKind[] = [
  "paragraph",
  "heading",
  "list",
  "quote",
  "image",
  "gallery",
  "video",
  "callout",
  "stats",
  "cta",
  "productCard",
  "newsletter",
  "faq",
  "table",
  "divider",
];

export const BLOCK_LABELS: Record<BlockKind, string> = {
  paragraph: "Paragraphe",
  heading: "Titre",
  list: "Liste",
  quote: "Citation",
  image: "Image",
  gallery: "Galerie",
  video: "Vidéo",
  callout: "Encadré",
  stats: "Chiffres clés",
  cta: "Appel à l'action",
  productCard: "Produits du catalogue",
  newsletter: "Newsletter",
  faq: "Questions fréquentes",
  table: "Tableau",
  divider: "Séparateur",
};

// ---- Sommaire ----

export interface TocEntry {
  /** Ancre HTML, unique dans la page. */
  readonly id: string;
  readonly level: 2 | 3;
  readonly text: string;
}
