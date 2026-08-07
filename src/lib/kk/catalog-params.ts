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
