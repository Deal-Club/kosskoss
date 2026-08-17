/**
 * Invalidation ciblée du cache du Journal.
 *
 * Les routes du catalogue appellent `revalidatePath("/", "layout")`, qui
 * reconstruit tout le site. C'est acceptable pour un produit dont le prix
 * s'affiche dans le panier et le pied de page ; ce serait disproportionné pour
 * un article, qui ne vit que dans son espace.
 *
 * On invalide donc les seules pages concernées, dans les deux langues.
 */

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/** Préfixe d'URL d'une langue : le français vit à la racine, l'anglais sous /en. */
function prefixes(): string[] {
  return routing.locales.map((locale) => (locale === routing.defaultLocale ? "" : `/${locale}`));
}

/**
 * Un article a changé : sa page, la liste, et les pages de taxonomie qui le
 * citent. Le slug est facultatif — à la création, il n'y a pas encore de page
 * à invalider.
 */
export function revalidateJournal(slug?: string): void {
  for (const prefix of prefixes()) {
    revalidatePath(`${prefix}/journal`);
    if (slug) revalidatePath(`${prefix}/journal/${slug}`);
    // Les listes par catégorie, tag et auteur affichent des cartes d'articles :
    // elles vieillissent dès qu'un article bouge.
    revalidatePath(`${prefix}/journal/categorie/[slug]`, "page");
    revalidatePath(`${prefix}/journal/tag/[slug]`, "page");
    revalidatePath(`${prefix}/journal/auteur/[slug]`, "page");
  }
}

/** La taxonomie a changé : les listes bougent, les articles eux-mêmes aussi. */
export function revalidateJournalTaxonomy(): void {
  for (const prefix of prefixes()) {
    revalidatePath(`${prefix}/journal`);
    revalidatePath(`${prefix}/journal/[slug]`, "page");
    revalidatePath(`${prefix}/journal/categorie/[slug]`, "page");
    revalidatePath(`${prefix}/journal/tag/[slug]`, "page");
    revalidatePath(`${prefix}/journal/auteur/[slug]`, "page");
  }
}
