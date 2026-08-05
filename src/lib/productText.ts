import type { Product } from "@/types/home";

// Les descriptions saisies dans le back-office ont toujours la priorité.
// Tant qu'un produit n'en a pas, on compose un texte à partir des données
// réelles de la fiche : jamais de texte de remplissage sur la boutique.
//
// Le produit et le libellé de catégorie reçus ici sont déjà localisés ; seule
// la phrase d'assemblage dépend encore de la langue.

export function productShortText(
  product: Product,
  categoryLabel: string,
  locale: string = "fr",
): string {
  if (product.shortDescription?.trim()) return product.shortDescription.trim();

  const highlights = product.bullets.slice(0, 2).join(" · ");

  if (locale === "en") {
    return highlights
      ? `${categoryLabel} by ${product.brand} — ${highlights}.`
      : `${categoryLabel} by ${product.brand}.`;
  }

  return highlights
    ? `${categoryLabel} von ${product.brand} — ${highlights}.`
    : `${categoryLabel} von ${product.brand}.`;
}

export function productLongText(
  product: Product,
  categoryLabel: string,
  locale: string = "fr",
): string {
  if (product.description?.trim()) return product.description.trim();

  const features = product.bullets.join(", ").toLowerCase();

  if (locale === "en") {
    return features
      ? `The ${product.brand} ${product.name} stands out in the ${categoryLabel} category with ${features}. A dependable choice for anyone who values quality and good value for money.`
      : `The ${product.brand} ${product.name} from our ${categoryLabel} range stands for dependable quality and good value for money.`;
  }

  return features
    ? `Le ${product.brand} ${product.name} se distingue dans la catégorie ${categoryLabel} par ${features}. Un choix fiable pour qui attend de la qualité et un bon rapport qualité-prix.`
    : `Le ${product.brand} ${product.name}, de la catégorie ${categoryLabel}, garantit une qualité constante et un bon rapport qualité-prix.`;
}
