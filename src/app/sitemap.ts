import type { MetadataRoute } from "next";
import { getCategoryPages } from "@/server/store";
import { listPublishedSlugs } from "@/server/journal/read";
import {
  TAG_INDEX_THRESHOLD,
  listAuthors,
  listCategories,
  listTags,
} from "@/server/journal/taxonomy";
import { listerSlugsMarquesVitrine } from "@/server/kk/marques";
import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mlc-bois.fr";

/** Le français vit à la racine, l'anglais sous /en — voir src/i18n/routing.ts. */
function urlFor(path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${SITE_URL}${prefix}${path === "/" ? "" : path}` || SITE_URL;
}

/** Chaque URL déclare ses équivalents dans l'autre langue (hreflang). */
function alternatesFor(path: string): Record<string, string> {
  return Object.fromEntries(routing.locales.map((locale) => [locale, urlFor(path, locale)]));
}

interface SitemapPath {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
  lastModified?: Date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, articles, journalCategories, journalTags, journalAuthors, brandSlugs] =
    await Promise.all([
      getCategoryPages(),
      listPublishedSlugs(),
      listCategories(),
      listTags(),
      listAuthors(),
      listerSlugsMarquesVitrine(),
    ]);

  const paths: SitemapPath[] = [{ path: "/", priority: 1, changeFrequency: "daily" }];

  for (const category of categories) {
    paths.push({
      path: `/${category.group}/${category.slug}`,
      priority: 0.8,
      changeFrequency: "weekly",
    });
    for (const product of category.products) {
      paths.push({
        path: `/${category.group}/${category.slug}/${product.slug}`,
        priority: 0.7,
        changeFrequency: "weekly",
      });
    }
  }

  // ---- Marques ----
  //
  // Une page de marque n'existe — au sens de `marqueVitrineParSlug` — que
  // pour une marque active ayant au moins un produit actif : la même règle
  // que pour les rubriques et auteurs du Journal ci-dessous. `brandSlugs` est
  // déjà filtré sur ce critère, donc chaque slug déclaré ici a réellement une
  // page à montrer, sans garde supplémentaire.
  for (const slug of brandSlugs) {
    paths.push({ path: `/marques/${slug}`, priority: 0.6, changeFrequency: "weekly" });
  }

  // ---- Le Journal ----
  //
  // Le principe ici n'est PAS de déclarer tout ce qui existe. Une page de
  // rubrique vide, une page de tag qui ne regroupe qu'un article, une page
  // auteur sans signature : ce sont des pages sans contenu propre. Les
  // soumettre dilue le budget d'exploration et fait baisser la qualité moyenne
  // perçue du site. On ne déclare donc que ce qui a de la matière.
  if (articles.length > 0) {
    paths.push({ path: "/journal", priority: 0.9, changeFrequency: "daily" });
  }

  for (const article of articles) {
    paths.push({
      path: `/journal/${article.slug}`,
      priority: 0.7,
      changeFrequency: "monthly",
      lastModified: article.updatedAt,
    });
  }

  for (const category of journalCategories) {
    if (!category.active || category.publishedCount === 0) continue;
    paths.push({
      path: `/journal/categorie/${category.slug}`,
      priority: 0.6,
      changeFrequency: "weekly",
    });
  }

  for (const tag of journalTags) {
    if (tag.publishedCount < TAG_INDEX_THRESHOLD) continue;
    paths.push({ path: `/journal/tag/${tag.slug}`, priority: 0.4, changeFrequency: "monthly" });
  }

  for (const author of journalAuthors) {
    if (!author.active || author.publishedCount === 0) continue;
    paths.push({
      path: `/journal/auteur/${author.slug}`,
      priority: 0.5,
      changeFrequency: "monthly",
    });
  }

  const now = new Date();

  return paths.flatMap(({ path, priority, changeFrequency, lastModified }) =>
    routing.locales.map((locale) => ({
      url: urlFor(path, locale),
      lastModified: lastModified ?? now,
      changeFrequency,
      priority,
      alternates: { languages: alternatesFor(path) },
    })),
  );
}
