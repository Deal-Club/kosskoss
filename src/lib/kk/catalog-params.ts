import type { CatalogSort } from "@/server/kk/catalog";
import { besoinParTag } from "./besoins";

const SORTS = new Set<CatalogSort>(["pertinence", "prix-asc", "prix-desc", "nouveautes"]);

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSort(value: string | string[] | undefined): CatalogSort {
  const v = one(value);
  return v && SORTS.has(v as CatalogSort) ? (v as CatalogSort) : "pertinence";
}

export function parseBrands(value: string | string[] | undefined): string[] {
  const v = one(value);
  return v
    ? v.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

/**
 * Besoin demandé dans l'URL (`?besoin=taches`). Une valeur inconnue est
 * ignorée plutôt que de renvoyer une erreur : un lien périmé affiche alors le
 * catalogue entier, ce qui reste utile.
 */
export function parseBesoin(value: string | string[] | undefined): string | undefined {
  return besoinParTag(one(value))?.tag;
}

/**
 * Page demandée (`?page=2`). Une valeur absurde — « 0 », « abc », « -3 » —
 * ramène à la première page plutôt qu'à une erreur : une URL malformée doit
 * afficher le rayon, pas un 500. Le plafond, lui, est appliqué par getCatalog,
 * seul à connaître le nombre de pages.
 */
export function parsePage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(one(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
