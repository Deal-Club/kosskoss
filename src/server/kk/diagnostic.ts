import { prisma } from "@/server/prisma";
import { aggregateProfileFromAnswers } from "./diagnostic-data";
import type { KKProductView, KKTone, KKBadge } from "@/types/kk";

const TONES: KKTone[] = ["clay", "sand", "teal", "rose"];

function toBadge(value: string | null): KKBadge {
  return value === "bestseller" || value === "nouveau" ? value : null;
}

function parseTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const v: unknown = JSON.parse(value);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Routine en 4 gestes, chaque geste puisé dans une catégorie du visage.
const ROUTINE_STEPS = [
  { key: "nettoyer", label: "Nettoyer", category: "nettoyants" },
  { key: "traiter", label: "Traiter", category: "serums" },
  { key: "hydrater", label: "Hydrater", category: "hydratants" },
  { key: "proteger", label: "Protéger", category: "solaires" },
] as const;

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
export async function buildRoutine(answerIds: string[]): Promise<DiagnosticResult> {
  const { tags, chips } = await aggregateProfileFromAnswers(answerIds);

  const rows = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, category: { group: { slug: "soins-visage" } } },
    include: { category: { include: { group: true } } },
  });

  const preferCheap = (tags.budget_eco ?? 0) > (tags.premium ?? 0);
  const preferPremium = (tags.premium ?? 0) > (tags.budget_eco ?? 0);

  const steps: RoutineStep[] = [];
  let total = 0;

  ROUTINE_STEPS.forEach((step, i) => {
    const candidates = rows
      .filter((p) => p.category.slug === step.category)
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
      key: step.key,
      label: step.label,
      why: best.shortDescription ?? "",
      product: {
        id: best.id,
        brand: best.brand,
        name: best.name,
        priceFcfa: best.priceCents,
        oldPriceFcfa: best.oldPriceCents ?? undefined,
        badge: toBadge(best.badge),
        tone: TONES[i % TONES.length],
        image: best.image,
        href: `/${best.category.group.slug}/${best.category.slug}/${best.slug}`,
      },
    });
  });

  return { chips: chips.slice(0, 4), steps, totalFcfa: total };
}
