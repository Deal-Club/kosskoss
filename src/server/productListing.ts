import { toCents } from "@/server/store";
import type { ProductRecord } from "@/server/types";

/**
 * Recherche et tri de la liste des produits du back-office.
 *
 * Extrait de la page pour que l'export CSV et PDF porte exactement sur ce que
 * l'écran affiche : mêmes filtres, même ordre, à la pagination près.
 */

export const SORT_OPTIONS = [
  { value: "name", label: "Nom A–Z" },
  { value: "brand", label: "Marque A–Z" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "stock-asc", label: "Stock croissant" },
  { value: "stock-desc", label: "Stock décroissant" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function isSortValue(value: string | undefined | null): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export interface ProductListingOptions {
  /** Recherche libre sur la marque et le nom. */
  query?: string;
  sort?: SortValue;
}

/**
 * Le catalogue est assez petit pour être filtré et trié en mémoire ; la couche
 * de données reste ainsi inchangée.
 */
export function filterAndSortProducts(
  products: ProductRecord[],
  { query = "", sort = "name" }: ProductListingOptions = {},
): ProductRecord[] {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? products.filter(
        (product) =>
          product.brand.toLowerCase().includes(needle) ||
          product.name.toLowerCase().includes(needle),
      )
    : products;

  return [...filtered].sort((a, b) => {
    switch (sort) {
      case "brand":
        return a.brand.localeCompare(b.brand, "fr") || a.name.localeCompare(b.name, "fr");
      case "price-asc":
        return toCents(a.price) - toCents(b.price);
      case "price-desc":
        return toCents(b.price) - toCents(a.price);
      case "stock-asc":
        return (a.stock ?? 0) - (b.stock ?? 0);
      case "stock-desc":
        return (b.stock ?? 0) - (a.stock ?? 0);
      default:
        return a.name.localeCompare(b.name, "fr");
    }
  });
}
