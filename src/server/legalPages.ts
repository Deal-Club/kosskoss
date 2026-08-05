/**
 * Contenu des pages légales et informatives, base d'abord, fichier en repli.
 *
 * Deux sources cohabitent, et l'ordre compte :
 *  1. la table `LegalContent`, alimentée par l'administration ;
 *  2. `src/content/legal/fr.ts` et `en.ts`, versionnés avec le code.
 *
 * La base l'emporte quand une ligne existe. Sinon le fichier est servi. Ce
 * repli n'est pas seulement une commodité de démarrage : ces pages sont
 * obligatoires (mentions légales, droit de rétractation…). Si la base est
 * injoignable ou
 * si une ligne est illisible, elles doivent quand même s'afficher — d'où les
 * `try/catch` qui retombent sur le fichier au lieu de laisser remonter
 * l'erreur.
 *
 * Toutes les lectures d'une langue passent par une seule requête, mise en
 * cache pour la durée du rendu : une page légale et le pied de page qui
 * l'entoure lisent le même corpus sans interroger la base deux fois.
 */

import { cache } from "react";
import { prisma } from "@/server/prisma";
import {
  DEFAULT_LEGAL_LOCALE,
  FOOTER_GROUP_IDS,
  FOOTER_GROUP_SLUGS,
  FOOTER_GROUP_TITLES,
  LEGAL_LOCALES,
  LEGAL_SLUGS,
  ORIGIN_PAGES,
  getLegalHref,
  isLegalLocale,
  isLegalSlug,
} from "@/content/legal";
import type {
  LegalFooterGroup,
  LegalFooterLink,
  LegalLocale,
  LegalPage,
  LegalPageMap,
  LegalSlug,
} from "@/content/legal/types";
import { parseStoredLegalPage } from "@/server/legalPageInput";

/** Contenu d'origine, celui du dépôt. */
const ORIGIN = ORIGIN_PAGES;

export interface LegalPageOverride {
  readonly page: LegalPage;
  readonly updatedAt: Date;
  readonly updatedBy: string;
}

/**
 * Réécritures d'une langue, indexées par slug.
 * Une ligne dont le contenu ne se relit pas est ignorée : la page d'origine
 * reprend la main plutôt que d'afficher une page cassée.
 */
const loadOverrides = cache(
  async (locale: LegalLocale): Promise<ReadonlyMap<LegalSlug, LegalPageOverride>> => {
    const overrides = new Map<LegalSlug, LegalPageOverride>();

    let rows: { slug: string; data: string; updatedAt: Date; updatedBy: string }[] = [];
    try {
      rows = await prisma.legalContent.findMany({
        where: { locale },
        select: { slug: true, data: true, updatedAt: true, updatedBy: true },
      });
    } catch (error) {
      // Base injoignable : les pages obligatoires s'affichent quand même.
      console.error("[legalPages] lecture des réécritures impossible", error);
      return overrides;
    }

    for (const row of rows) {
      if (!isLegalSlug(row.slug)) continue;
      const page = parseStoredLegalPage(row.data, row.slug);
      if (!page) {
        console.error(`[legalPages] contenu illisible pour ${row.slug}/${locale}`);
        continue;
      }
      overrides.set(row.slug, { page, updatedAt: row.updatedAt, updatedBy: row.updatedBy });
    }

    return overrides;
  },
);

/** Corpus complet d'une langue, réécritures appliquées. */
export const getLegalPageMap = cache(async (locale: LegalLocale): Promise<LegalPageMap> => {
  const overrides = await loadOverrides(locale);
  if (overrides.size === 0) return ORIGIN[locale];

  const pages = {} as Record<LegalSlug, LegalPage>;
  for (const slug of LEGAL_SLUGS) {
    pages[slug] = overrides.get(slug)?.page ?? ORIGIN[locale][slug];
  }
  return pages;
});

/**
 * Page affichée sur la boutique.
 * Rend `undefined` sur un slug ou une langue inconnus, pour que l'appelant
 * puisse déclencher `notFound()`.
 */
export async function findLegalPage(slug: string, locale: string): Promise<LegalPage | undefined> {
  if (!isLegalSlug(slug) || !isLegalLocale(locale)) return undefined;
  const pages = await getLegalPageMap(locale);
  return pages[slug];
}

/** Toutes les pages d'une langue, dans l'ordre d'affichage. */
export async function listLegalPages(locale: LegalLocale): Promise<readonly LegalPage[]> {
  const pages = await getLegalPageMap(locale);
  return LEGAL_SLUGS.map((slug) => pages[slug]);
}

function toFooterLink(slug: LegalSlug, locale: LegalLocale, pages: LegalPageMap): LegalFooterLink {
  return { slug, label: pages[slug].title, href: getLegalHref(slug, locale) };
}

/**
 * Colonnes du pied de page.
 * Les libellés sont les titres des pages : renommer une page depuis
 * l'administration renomme aussi son lien.
 */
export async function getLegalFooterGroups(
  locale: LegalLocale = DEFAULT_LEGAL_LOCALE,
): Promise<readonly LegalFooterGroup[]> {
  const pages = await getLegalPageMap(locale);
  return FOOTER_GROUP_IDS.map((id) => ({
    id,
    title: FOOTER_GROUP_TITLES[locale][id],
    links: FOOTER_GROUP_SLUGS[id].map((slug) => toFooterLink(slug, locale, pages)),
  }));
}

// ---- Administration ----

/** Une page vue depuis le back-office, dans une langue. */
export interface LegalPageVersion {
  readonly page: LegalPage;
  /** Vrai si le contenu vient de la base, faux s'il vient du fichier d'origine. */
  readonly customized: boolean;
  readonly updatedAt: Date | null;
  readonly updatedBy: string | null;
}

export interface LegalPageSummary {
  readonly slug: LegalSlug;
  readonly versions: Readonly<Record<LegalLocale, LegalPageVersion>>;
}

/** Version éditable d'une page, avec sa provenance. */
export async function getLegalPageVersion(
  slug: LegalSlug,
  locale: LegalLocale,
): Promise<LegalPageVersion> {
  const overrides = await loadOverrides(locale);
  const override = overrides.get(slug);

  if (!override) {
    return { page: ORIGIN[locale][slug], customized: false, updatedAt: null, updatedBy: null };
  }
  return {
    page: override.page,
    customized: true,
    updatedAt: override.updatedAt,
    updatedBy: override.updatedBy,
  };
}

/** Les dix pages, dans les deux langues, pour la liste du back-office. */
export async function listLegalPageSummaries(): Promise<readonly LegalPageSummary[]> {
  const [fr, en] = await Promise.all(LEGAL_LOCALES.map((locale) => loadOverrides(locale)));
  const byLocale = { fr, en } as const;

  return LEGAL_SLUGS.map((slug) => {
    const versions = {} as Record<LegalLocale, LegalPageVersion>;
    for (const locale of LEGAL_LOCALES) {
      const override = byLocale[locale].get(slug);
      versions[locale] = override
        ? {
            page: override.page,
            customized: true,
            updatedAt: override.updatedAt,
            updatedBy: override.updatedBy,
          }
        : { page: ORIGIN[locale][slug], customized: false, updatedAt: null, updatedBy: null };
    }
    return { slug, versions };
  });
}

/** Enregistre une réécriture. Le contenu doit déjà avoir été contrôlé. */
export async function saveLegalPage(
  slug: LegalSlug,
  locale: LegalLocale,
  page: LegalPage,
  updatedBy: string,
): Promise<void> {
  const data = JSON.stringify(page);
  await prisma.legalContent.upsert({
    where: { slug_locale: { slug, locale } },
    create: { slug, locale, data, updatedBy },
    update: { data, updatedBy },
  });
}

/**
 * Supprime la réécriture : la page revient au contenu du dépôt.
 * Rend faux si la page n'avait jamais été modifiée.
 */
export async function resetLegalPage(slug: LegalSlug, locale: LegalLocale): Promise<boolean> {
  const deleted = await prisma.legalContent.deleteMany({ where: { slug, locale } });
  return deleted.count > 0;
}

/** Contenu du dépôt, tel qu'affiché avant toute modification. */
export function getOriginLegalPage(slug: LegalSlug, locale: LegalLocale): LegalPage {
  return ORIGIN[locale][slug];
}
