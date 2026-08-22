import { prisma } from "@/server/prisma";
import { aggregateProfileFromAnswers } from "./diagnostic-data";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import type { KKProductView } from "@/types/kk";
import { parseTags } from "@/lib/kk/tags";
import { gestesActifs, libelleGeste } from "@/lib/kk/gestes-selection";
import { lireGestes } from "./gestes";
import type { Locale } from "@/i18n/routing";

export type RoutineStep = {
  index: number;
  key: string;
  label: string;
  why: string;
  product: KKProductView;
};

export type DiagnosticResult = {
  chips: string[];
  steps: RoutineStep[];
  totalFcfa: number;
};

function scoreOf(productTags: string[], profile: Record<string, number>): number {
  return productTags.reduce((sum, tag) => sum + (profile[tag] ?? 0), 0);
}

/**
 * Construit une routine personnalisée : pour chaque geste, le produit de la
 * catégorie qui correspond le mieux au profil (score de tags), en respectant la
 * préférence de budget et la disponibilité.
 */
export async function buildRoutine(
  answerIds: string[],
  locale: Locale = "fr",
): Promise<DiagnosticResult> {
  const { tags, chips } = await aggregateProfileFromAnswers(answerIds);

  const rows = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, category: { group: { slug: "soins-visage" } } },
    include: PRODUCT_VIEW_INCLUDE,
  });

  const preferCheap = (tags.budget_eco ?? 0) > (tags.premium ?? 0);
  const preferPremium = (tags.premium ?? 0) > (tags.budget_eco ?? 0);

  // Les gestes viennent de la base : leur nombre, leur ordre et leur activation
  // sont des réglages du client, plus une constante de code.
  const gestes = gestesActifs(await lireGestes());

  const steps: RoutineStep[] = [];
  let total = 0;

  gestes.forEach((geste, i) => {
    const candidates = rows
      .filter((p) => p.category.slug === geste.category)
      .map((p) => ({ p, score: scoreOf(parseTags(p.tags), tags) }));
    if (candidates.length === 0) return;

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (preferCheap) return a.p.priceCents - b.p.priceCents;
      if (preferPremium) return b.p.priceCents - a.p.priceCents;
      return a.p.priceCents - b.p.priceCents;
    });

    const best = candidates[0].p;
    total += best.priceCents;
    steps.push({
      index: i + 1,
      key: geste.key,
      label: libelleGeste(geste, locale),
      why: best.shortDescription ?? "",
      product: toProductView(best, locale, i),
    });
  });

  return { chips: chips.slice(0, 4), steps, totalFcfa: total };
}
