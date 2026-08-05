// Pagination commune aux tableaux du back-office.
// Le découpage se fait en mémoire : les volumes concernés (quelques milliers de
// lignes au plus) ne justifient pas encore un LIMIT/OFFSET en base, et cela
// garde la recherche et les tris déjà appliqués côté serveur.

export const ADMIN_PAGE_SIZE = 25;

export interface PageInfo {
  /** Page courante, toujours comprise entre 1 et pageCount. */
  page: number;
  pageCount: number;
  totalItems: number;
  /** Index de la première ligne affichée, à partir de 1 (0 si vide). */
  firstItem: number;
  lastItem: number;
}

export interface Paginated<T> extends PageInfo {
  items: T[];
}

/** Lit un paramètre `?page=` sans jamais faire échouer la page. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number = ADMIN_PAGE_SIZE,
): Paginated<T> {
  const totalItems = items.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  // Une page hors bornes ramène à la dernière page plutôt qu'à un tableau vide
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return {
    items: slice,
    page: current,
    pageCount,
    totalItems,
    firstItem: totalItems === 0 ? 0 : start + 1,
    lastItem: start + slice.length,
  };
}

/**
 * Construit le lien d'une page en conservant les filtres déjà actifs
 * (recherche, tri, catégorie, statut…).
 */
export function pageHref(
  basePath: string,
  params: Record<string, string | string[] | undefined>,
  page: number,
  /** Nom du paramètre, à changer quand une page porte deux tableaux. */
  pageParam: string = "page",
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === pageParam || value === undefined) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }

  if (page > 1) query.set(pageParam, String(page));

  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}
