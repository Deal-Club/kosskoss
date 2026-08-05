/**
 * Types partagés du contenu légal et informatif de la boutique.
 *
 * Le corps des sections est du TEXTE SIMPLE (jamais de HTML brut) :
 * - les paragraphes sont séparés par une ligne vide (`\n\n`) ;
 * - le rendu doit donc découper sur `\n\n` et échapper le texte normalement
 *   (aucun `dangerouslySetInnerHTML` n'est nécessaire ni souhaitable).
 */

/** Langues disponibles pour les pages légales. */
export type LegalLocale = "fr" | "en";

/** Identifiants d'URL des pages légales et informatives. */
export type LegalSlug =
  | "mentions-legales"
  | "cgv"
  | "confidentialite"
  | "retractation"
  | "livraison"
  | "moyens-de-paiement"
  | "retours"
  | "faq"
  | "a-propos"
  | "contact";

/**
 * Bloc de contenu d'une page.
 * `list` sert aux énumérations (adresses, conditions, étapes…) et s'affiche
 * après le corps de texte.
 */
export interface LegalSection {
  /** Titre du bloc, rendu en <h2>. */
  readonly heading: string;
  /** Texte du bloc, paragraphes séparés par `\n\n`. Peut être vide si seule la liste compte. */
  readonly body: string;
  /** Puces optionnelles rendues sous le corps de texte. */
  readonly list?: readonly string[];
}

/** Page légale ou informative complète. */
export interface LegalPage {
  /** Identifiant d'URL, identique dans toutes les langues. */
  readonly slug: LegalSlug;
  /** Titre de la page, rendu en <h1> et réutilisable pour les métadonnées. */
  readonly title: string;
  /**
   * Chapeau affiché avant les sections.
   * Sur les pages juridiques, il commence par l'avertissement « modèle à faire
   * valider par un juriste ». Absent sur la FAQ, « À propos » et « Contact ».
   */
  readonly intro?: string;
  /** Contenu de la page. */
  readonly sections: readonly LegalSection[];
  /** Date de dernière révision au format ISO `AAAA-MM-JJ`. */
  readonly updatedAt: string;
}

/** Dictionnaire complet des pages d'une langue : chaque slug doit être fourni. */
export type LegalPageMap = Readonly<Record<LegalSlug, LegalPage>>;

/** Lien prêt à poser dans le pied de page ou un menu de service. */
export interface LegalFooterLink {
  readonly slug: LegalSlug;
  readonly label: string;
  /** Chemin absolu déjà préfixé par la langue (`/mentions-legales`, `/en/mentions-legales`…). */
  readonly href: string;
}

/** Colonne de liens du pied de page (Service / Légal / Entreprise). */
export interface LegalFooterGroup {
  /** Identifiant stable de la colonne, utile comme clé React. */
  readonly id: "service" | "legal" | "company";
  /** Titre traduit de la colonne. */
  readonly title: string;
  readonly links: readonly LegalFooterLink[];
}
