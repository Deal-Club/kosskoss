import { prisma } from "@/server/prisma";

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

/** Questionnaire actif, pour le parcours front (ordre par position). */
export async function getQuestions(): Promise<ClientQuestion[]> {
  const questions = await prisma.diagQuestion.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    include: { answers: { where: { active: true }, orderBy: { position: "asc" } } },
  });
  return questions.map((q) => ({
    id: q.id,
    title: q.title,
    subtitle: q.subtitle,
    answers: q.answers.map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
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
): Promise<{ tags: Record<string, number>; chips: string[] }> {
  if (answerIds.length === 0) return { tags: {}, chips: [] };
  const answers = await prisma.diagAnswer.findMany({
    where: { id: { in: answerIds } },
    include: { question: { select: { position: true } } },
    orderBy: { question: { position: "asc" } },
  });
  const tags: Record<string, number> = {};
  const chips: string[] = [];
  for (const a of answers) {
    for (const [tag, weight] of Object.entries(parseWeights(a.tags))) {
      tags[tag] = (tags[tag] ?? 0) + weight;
    }
    if (a.chip) chips.push(a.chip);
  }
  return { tags, chips };
}
