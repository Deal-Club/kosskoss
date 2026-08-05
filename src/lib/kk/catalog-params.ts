import type { CatalogSort } from "@/server/kk/catalog";

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
