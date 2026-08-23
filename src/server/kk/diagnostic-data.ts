import { prisma } from "@/server/prisma";
import { pickText, needsTranslation } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";

export type ClientAnswer = {
  id: string;
  label: string;
  description: string;
  icon: string;
};
export type ClientQuestion = {
  id: string;
  title: string;
  subtitle: string;
  answers: ClientAnswer[];
};

/**
 * Questionnaire actif, pour le parcours front (ordre par position).
 *
 * Rend TOUTES les questions actives, y compris celles qui porteraient une
 * condition (`DiagQuestion.conditionQuestion` / `conditionReponses` — voir
 * src/lib/kk/diagnostic-conditions.ts). Aujourd'hui sans effet : toutes les
 * questions en base ont une condition vide, donc `questionVisible()` les rend
 * toutes visibles, et `questions.length` (utilisé par DiagnosticFlow pour
 * l'étape courante et le total affiché — « Question X sur Y ») reste exact.
 * Le jour où une question conditionnelle (le « Q5 pores » du quiz client) est
 * créée, filtrer dynamiquement cette liste selon les réponses déjà données
 * — pour que la question invisible ne compte ni dans le total, ni dans la
 * navigation — sera à faire ici et dans DiagnosticFlow, avec ce module pur.
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
    title: pickText(q.title, traduire ? q.titleEn : undefined),
    subtitle: pickText(q.subtitle, traduire ? q.subtitleEn : undefined),
    answers: q.answers.map((a) => ({
      id: a.id,
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
