/**
 * Contenu légal et informatif d'ORIGINE — celui qui est versionné avec le code.
 *
 * Ce module ne doit pas être lu directement par une page : depuis que
 * l'administration peut réécrire ces textes, la source de vérité est
 * `src/server/legalPages.ts`, qui interroge la base et retombe ici quand aucune
 * réécriture n'existe.
 *
 * Ce qui reste exporté ici est ce qui ne dépend pas de la base : la liste des
 * slugs, les gardes de type, la construction des adresses et la répartition des
 * liens en colonnes de pied de page.
 */

import { frLegalPages } from "./fr";
import { enLegalPages } from "./en";
import type { LegalFooterGroup, LegalLocale, LegalPageMap, LegalSlug } from "./types";

/**
 * Identité de l'entreprise, source unique pour les mentions légales comme pour
 * la facture PDF. Elle ne dépend pas de la base : ces mentions engagent la
 * société et ne sont pas modifiables depuis le back-office.
 */
export { COMPANY } from "./fr";

export type {
  LegalFooterGroup,
  LegalFooterLink,
  LegalLocale,
  LegalPage,
  LegalPageMap,
  LegalSection,
  LegalSlug,
} from "./types";

/** Langue par défaut de la boutique (marché français). */
export const DEFAULT_LEGAL_LOCALE: LegalLocale = "fr";

/** Toutes les langues disponibles, utile pour `generateStaticParams`. */
export const LEGAL_LOCALES: readonly LegalLocale[] = ["fr", "en"];

/** Tous les slugs, dans l'ordre d'affichage souhaité. */
export const LEGAL_SLUGS: readonly LegalSlug[] = [
  "mentions-legales",
  "cgv",
  "confidentialite",
  "retractation",
  "livraison",
  "moyens-de-paiement",
  "retours",
  "faq",
  "a-propos",
  "contact",
];

/** Titre affiché dans le back-office pour chaque page. */
export const LEGAL_SLUG_LABELS: Readonly<Record<LegalSlug, string>> = {
  "mentions-legales": "Mentions légales",
  cgv: "Conditions générales de vente",
  confidentialite: "Politique de confidentialité",
  retractation: "Droit de rétractation",
  livraison: "Livraison",
  "moyens-de-paiement": "Moyens de paiement",
  retours: "Retours & réclamations",
  faq: "FAQ",
  "a-propos": "À propos",
  contact: "Contact",
};

/** Corpus d'origine, indexé par langue. */
export const ORIGIN_PAGES: Readonly<Record<LegalLocale, LegalPageMap>> = {
  fr: frLegalPages,
  en: enLegalPages,
};

/** Vérifie qu'une chaîne quelconque correspond bien à un slug connu. */
export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

/** Vérifie qu'une chaîne quelconque correspond bien à une langue gérée. */
export function isLegalLocale(value: string): value is LegalLocale {
  return (LEGAL_LOCALES as readonly string[]).includes(value);
}

/**
 * Construit le chemin d'une page : `/mentions-legales` en français,
 * `/en/mentions-legales` en anglais.
 */
export function getLegalHref(slug: LegalSlug, locale: LegalLocale = DEFAULT_LEGAL_LOCALE): string {
  return locale === DEFAULT_LEGAL_LOCALE ? `/${slug}` : `/${locale}/${slug}`;
}

/** Intitulés des colonnes du pied de page, par langue. */
export const FOOTER_GROUP_TITLES: Readonly<
  Record<LegalLocale, Readonly<Record<LegalFooterGroup["id"], string>>>
> = {
  fr: { service: "Service", legal: "Informations légales", company: "Entreprise" },
  en: { service: "Service", legal: "Legal", company: "Company" },
};

/** Ordre des colonnes du pied de page. */
export const FOOTER_GROUP_IDS = ["service", "legal", "company"] as const;

/**
 * Répartition des slugs par colonne du pied de page.
 *
 * « retractation » n'y figure pas : la page existe toujours et reste servie à
 * son adresse, elle n'est simplement plus listée ici. Les liens qui y mènent
 * depuis le tunnel de commande et depuis le suivi de commande restent la voie
 * d'accès.
 */
export const FOOTER_GROUP_SLUGS: Readonly<Record<LegalFooterGroup["id"], readonly LegalSlug[]>> = {
  service: ["livraison", "moyens-de-paiement", "retours", "faq"],
  legal: ["mentions-legales", "cgv", "confidentialite"],
  company: ["a-propos", "contact"],
};

export { frLegalPages, enLegalPages };
