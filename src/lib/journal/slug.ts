/**
 * Résolution des slugs d'articles.
 *
 * La règle qui compte est le GEL. Tant qu'un article n'a jamais été publié, son
 * slug suit son titre : on corrige une coquille, l'URL suit. Une fois publié,
 * il se fige — modifier « Choisir son nettoyant en 2026 » ne doit pas casser
 * une adresse indexée, partagée sur WhatsApp ou citée ailleurs. Un changement
 * reste possible, mais il devient explicite et laisse une redirection derrière
 * lui.
 */

import { slugify } from "@/lib/slugify";

/**
 * Slugs interdits aux articles : ce sont les segments statiques de l'espace
 * éditorial. Un article nommé « Catégorie » qui prendrait le slug `categorie`
 * masquerait `/journal/categorie/<slug>`.
 */
export const RESERVED_ARTICLE_SLUGS: readonly string[] = [
  "categorie",
  "tag",
  "auteur",
  "recherche",
  "page",
  "apercu",
];

/**
 * Slugs interdits au catalogue.
 *
 * Next fait toujours gagner un segment statique sur un segment dynamique :
 * `/journal` l'emporte sur `/[group]`. Un univers produit dont le slug serait
 * `journal` deviendrait donc injoignable, sans message d'erreur. C'est le
 * genre de panne qu'on ne diagnostique jamais du premier coup — mieux vaut
 * refuser le slug à la saisie.
 */
export const RESERVED_CATALOG_SLUGS: readonly string[] = ["journal"];

/** Slug de repli quand un titre ne contient aucun caractère exploitable. */
const FALLBACK = "article";

export function articleSlug(title: string): string {
  return slugify(title);
}

/** Premier slug libre à partir d'une base, en évitant les slugs réservés. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const start = articleSlug(base) || FALLBACK;
  const used = new Set(taken);
  const unavailable = (candidate: string) =>
    used.has(candidate) || RESERVED_ARTICLE_SLUGS.includes(candidate);

  if (!unavailable(start)) return start;

  let suffix = 2;
  while (unavailable(`${start}-${suffix}`)) suffix += 1;
  return `${start}-${suffix}`;
}

export interface ResolveSlugInput {
  readonly title: string;
  /** Slug saisi à la main. Vide = l'administrateur n'y a pas touché. */
  readonly manualSlug: string;
  /** Slug actuel en base. Vide à la création. */
  readonly currentSlug: string;
  /** L'article a-t-il déjà été publié une fois ? */
  readonly everPublished: boolean;
  /** Slugs des autres articles. Le slug courant peut y figurer, il est ignoré. */
  readonly taken: Iterable<string>;
}

export interface ResolvedSlug {
  readonly slug: string;
  /** Ancien slug à rediriger, ou `null` si rien ne change. */
  readonly redirectFrom: string | null;
}

export function resolveSlug(input: ResolveSlugInput): ResolvedSlug {
  const manual = input.manualSlug.trim();

  const desired = manual
    ? articleSlug(manual)
    : input.everPublished && input.currentSlug
      ? input.currentSlug
      : articleSlug(input.title);

  // Un article ne se heurte jamais à son propre slug.
  const others = [...input.taken].filter((slug) => slug !== input.currentSlug);
  const slug = uniqueSlug(desired, others);

  const redirectFrom =
    input.everPublished && input.currentSlug && input.currentSlug !== slug ? input.currentSlug : null;

  return { slug, redirectFrom };
}
