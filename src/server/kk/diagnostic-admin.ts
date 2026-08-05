import { prisma } from "@/server/prisma";

export type AdminAnswer = {
  id: string; // "" = nouvelle réponse
  key: string;
  label: string;
  description: string;
  icon: string;
  chip: string;
  tagsText: string; // « peau_grasse:3, imperfections:1 »
  active: boolean;
};

export type AdminQuestion = {
  id: string; // "" = nouvelle question
  key: string;
  title: string;
  subtitle: string;
  active: boolean;
  answers: AdminAnswer[];
};

function weightsToText(json: string): string {
  try {
    const o: unknown = JSON.parse(json);
    if (o && typeof o === "object" && !Array.isArray(o)) {
      return Object.entries(o as Record<string, unknown>)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => `${k}:${v as number}`)
        .join(", ");
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function parseTagsText(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of text.split(",")) {
    const [k, w] = part.split(":").map((s) => s.trim());
    if (k && w !== undefined && w !== "" && !Number.isNaN(Number(w))) out[k] = Number(w);
  }
  return out;
}

/** Questionnaire complet (actif ou non) pour l'édition en back-office. */
export async function getAdminQuestionnaire(): Promise<AdminQuestion[]> {
  const questions = await prisma.diagQuestion.findMany({
    orderBy: { position: "asc" },
    include: { answers: { orderBy: { position: "asc" } } },
  });
  return questions.map((q) => ({
    id: q.id,
    key: q.key,
    title: q.title,
    subtitle: q.subtitle,
    active: q.active,
    answers: q.answers.map((a) => ({
      id: a.id,
      key: a.key,
      label: a.label,
      description: a.description,
      icon: a.icon,
      chip: a.chip,
      tagsText: weightsToText(a.tags),
      active: a.active,
    })),
  }));
}

/** Enregistre l'intégralité du questionnaire (réconciliation création/mise à jour/suppression). */
export async function saveQuestionnaire(questions: AdminQuestion[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const keepQ = questions.map((q) => q.id).filter((x): x is string => x !== "");
    await tx.diagQuestion.deleteMany({ where: keepQ.length ? { id: { notIn: keepQ } } : {} });

    for (const [qi, q] of questions.entries()) {
      let questionId = q.id;
      const data = {
        key: q.key || `q_${qi}_${q.title.slice(0, 12).replace(/\W+/g, "_").toLowerCase()}`,
        title: q.title,
        subtitle: q.subtitle,
        active: q.active,
        position: qi,
      };
      if (questionId) {
        await tx.diagQuestion.update({ where: { id: questionId }, data });
      } else {
        const created = await tx.diagQuestion.create({ data });
        questionId = created.id;
      }

      const keepA = q.answers.map((a) => a.id).filter((x): x is string => x !== "");
      await tx.diagAnswer.deleteMany({
        where: { questionId, ...(keepA.length ? { id: { notIn: keepA } } : {}) },
      });

      for (const [ai, a] of q.answers.entries()) {
        const answerData = {
          key: a.key || `a_${ai}`,
          label: a.label,
          description: a.description,
          icon: a.icon || "check",
          chip: a.chip,
          tags: JSON.stringify(parseTagsText(a.tagsText)),
          active: a.active,
          position: ai,
        };
        if (a.id) {
          await tx.diagAnswer.update({ where: { id: a.id }, data: answerData });
        } else {
          await tx.diagAnswer.create({ data: { questionId, ...answerData } });
        }
      }
    }
  });
}
