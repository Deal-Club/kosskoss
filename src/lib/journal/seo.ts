/**
 * Replis SEO d'un article.
 *
 * Un rédacteur remplit le titre et le chapeau ; il ne remplit presque jamais
 * les douze champs SEO. L'enjeu n'est donc pas de les stocker mais de décider
 * proprement ce qui est servi quand ils sont vides — une seule fois, ici,
 * plutôt que dispersé dans `generateMetadata`, le JSON-LD et l'aperçu du
 * back-office, où les trois finiraient par diverger.
 */

export interface ArticleSeoSource {
  readonly title: string;
  readonly excerpt: string;
  readonly coverImage: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogImage: string;
  readonly twitterTitle: string;
  readonly twitterDescription: string;
  readonly twitterImage: string;
  readonly canonicalUrl: string;
  readonly robotsNoindex: boolean;
}

export interface ArticleSeoOptions {
  readonly brandName: string;
  /** Canonique calculée par le routage, servant de valeur par défaut. */
  readonly canonical: string;
}

export interface ResolvedArticleSeo {
  readonly title: string;
  readonly description: string;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogImage: string;
  readonly twitterTitle: string;
  readonly twitterDescription: string;
  readonly twitterImage: string;
  readonly canonical: string;
  readonly noindex: boolean;
}

function trimmed(value: string): string {
  return value.trim();
}

/** Une canonique saisie à la main n'est retenue que si c'est une adresse http(s). */
function usableCanonical(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function resolveArticleSeo(
  source: ArticleSeoSource,
  options: ArticleSeoOptions,
): ResolvedArticleSeo {
  // Suffixer la marque aide en résultat de recherche, mais « Le guide KossKoss
  // Select — KossKoss Select » dessert tout le monde.
  const withBrand = source.title.includes(options.brandName)
    ? source.title
    : `${source.title} — ${options.brandName}`;

  const title = trimmed(source.metaTitle) || withBrand;
  const description = trimmed(source.metaDescription) || trimmed(source.excerpt);

  const ogTitle = trimmed(source.ogTitle) || title;
  const ogDescription = trimmed(source.ogDescription) || description;
  const ogImage = trimmed(source.ogImage) || trimmed(source.coverImage);

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    twitterTitle: trimmed(source.twitterTitle) || ogTitle,
    twitterDescription: trimmed(source.twitterDescription) || ogDescription,
    twitterImage: trimmed(source.twitterImage) || ogImage,
    canonical: usableCanonical(source.canonicalUrl) ? trimmed(source.canonicalUrl) : options.canonical,
    noindex: source.robotsNoindex,
  };
}
