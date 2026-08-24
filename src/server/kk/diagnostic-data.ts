import { prisma } from "@/server/prisma";
import { pickText, needsTranslation } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";

export type ClientAnswer = {
  id: string;
  /** DiagAnswer.key — stable, indépendante de la langue. C'est elle que lit
   *  `questionVisible()` (src/lib/kk/diagnostic-conditions.ts) pour évaluer la
   *  condition d'affichage de Q5, et c'est elle que le moteur (tâche 3, voir
   *  src/server/kk/diagnostic.ts) route vers la matrice de décision. */
  key: string;
  label: string;
  description: string;
  icon: string;
};
export type ClientQuestion = {
  id: string;
  /** DiagQuestion.key — voir ClientAnswer.key ci-dessus. */
  key: string;
  title: string;
  subtitle: string;
  answers: ClientAnswer[];
  /** Condition d'affichage (voir src/lib/kk/diagnostic-conditions.ts). Une
   *  `conditionQuestion` vide veut dire « toujours affichée ». */
  conditionQuestion: string;
  conditionReponses: string;
};

/**
 * Questionnaire actif, pour le parcours front (ordre par position).
 *
 * Rend TOUTES les questions actives, y compris la question conditionnelle
 * (Q5 « pores » du quiz client) — c'est au parcours (DiagnosticFlow), qui
 * connaît les réponses déjà données, de filtrer dynamiquement cette liste
 * avec `questionVisible()` avant d'en tirer la navigation et le total affiché
 * (« Question X sur Y ») : une question conditionnelle non encore déclenchée
 * ne doit compter ni dans l'un ni dans l'autre. Ce module reste pur de ce
 * filtrage : il rend la liste brute, dans l'ordre de `position`, avec de quoi
 * l'évaluer (`conditionQuestion`/`conditionReponses`) et de quoi la router
 * (`key` de chaque question et de chaque réponse).
 */
export async function getQuestions(locale: Locale): Promise<ClientQuestion[]> {
  const questions = await prisma.diagQuestion.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    include: { answers: { where: { active: true }, orderBy: { position: "asc" } } },
  });
  const traduire = needsTranslation(locale);
  return questions.map((q) => ({
    id: q.id,
    key: q.key,
    title: pickText(q.title, traduire ? q.titleEn : undefined),
    subtitle: pickText(q.subtitle, traduire ? q.subtitleEn : undefined),
    conditionQuestion: q.conditionQuestion,
    conditionReponses: q.conditionReponses,
    answers: q.answers.map((a) => ({
      id: a.id,
      key: a.key,
      label: pickText(a.label, traduire ? a.labelEn : undefined),
      description: pickText(a.description, traduire ? a.descriptionEn : undefined),
      icon: a.icon,
    })),
  }));
}

function parseWeights(value: string): Record<string, number> {
  try {
    const v: unknown = JSON.parse(value);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, number> = {};
      for (const [k, w] of Object.entries(v as Record<string, unknown>)) {
        if (typeof w === "number") out[k] = w;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Agrège les réponses choisies (ids en base) en profil pondéré + étiquettes. */
export async function aggregateProfileFromAnswers(
  answerIds: string[],
  locale: Locale,
): Promise<{ tags: Record<string, number>; chips: string[] }> {
  if (answerIds.length === 0) return { tags: {}, chips: [] };
  const answers = await prisma.diagAnswer.findMany({
    where: { id: { in: answerIds } },
    include: { question: { select: { position: true } } },
    orderBy: { question: { position: "asc" } },
  });
  const traduire = needsTranslation(locale);
  const tags: Record<string, number> = {};
  const chips: string[] = [];
  for (const a of answers) {
    for (const [tag, weight] of Object.entries(parseWeights(a.tags))) {
      tags[tag] = (tags[tag] ?? 0) + weight;
    }
    const chip = pickText(a.chip, traduire ? a.chipEn : undefined);
    if (chip) chips.push(chip);
  }
  return { tags, chips };
}
