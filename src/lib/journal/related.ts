/**
 * Choix des articles similaires.
 *
 * Le classement est calculé ici plutôt que confié à un `ORDER BY` : un « même
 * catégorie, du plus récent au plus ancien » afficherait les trois mêmes
 * articles au bas de tous les articles d'une catégorie, ce qui n'aide ni le
 * lecteur ni le maillage interne.
 *
 * Les tags pèsent donc plus lourd que la catégorie — deux articles partageant
 * « hydratation » se ressemblent davantage que deux articles rangés dans
 * « Soin » — et la récence ne sert qu'à départager les ex æquo. Quand rien ne
 * correspond, la fonction ne rend pas une liste vide : elle retombe sur les
 * articles récents, un score nul restant un score.
 */

const TAG_WEIGHT = 3;
const CATEGORY_WEIGHT = 2;

export interface RelatedSource {
  readonly id: string;
  readonly categoryId: string;
  readonly tagIds: readonly string[];
}

export interface RelatedCandidate extends RelatedSource {
  readonly publishedAt: Date;
}

export function pickRelated<T extends RelatedCandidate>(
  current: RelatedSource,
  candidates: readonly T[],
  limit: number,
): T[] {
  const currentTags = new Set(current.tagIds);

  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .map((candidate) => {
      const shared = candidate.tagIds.filter((tag) => currentTags.has(tag)).length;
      const sameCategory = candidate.categoryId === current.categoryId ? CATEGORY_WEIGHT : 0;
      return { candidate, score: shared * TAG_WEIGHT + sameCategory };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.candidate.publishedAt.getTime() - a.candidate.publishedAt.getTime();
    })
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.candidate);
}
