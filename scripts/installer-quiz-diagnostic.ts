/**
 * Installe le quiz de diagnostic peau écrit par le client (Quiz Diagnostic
 * Peau KossKoss Select_complète.docx), en trois volets :
 *
 *  1. Pose l'étiquette de besoin (`Routine.besoinTag`) des 14 routines
 *     importées du master, à partir de leur code (`TAC-*` → `taches`, et
 *     ainsi de suite pour les sept familles — voir `besoinDuCodeRoutine`,
 *     src/lib/kk/diagnostic-matrice.ts, qui LIT la matrice plutôt que de
 *     recopier une seconde table). Sans cette étiquette, le moteur de
 *     recommandation (tâche 3 de ce lot) ne peut relier aucune routine à
 *     une réponse du quiz.
 *  2. Désactive les cinq questions actuelles du Diagnostic Beauté
 *     (`type`, `concern`, `sensitivity`, `budget`, `sun`) — DÉSACTIVÉES,
 *     PAS SUPPRIMÉES : des profils clients (`src/server/kk/profil-diagnostic.ts`)
 *     y font référence par id, et les supprimer rendrait leur historique
 *     illisible.
 *  3. Pose les cinq questions du quiz client, avec leurs réponses, et la
 *     condition d'affichage de Q5 (elle ne s'affiche que si Q2 = « Boutons /
 *     Imperfections » ou « Glow / Éclat » — évaluée par
 *     src/lib/kk/diagnostic-conditions.ts, appelée par le parcours à la
 *     tâche 3, pas encore aujourd'hui).
 *
 * IDEMPOTENT : chaque écriture est un upsert par clé stable (`Routine.code`,
 * `DiagQuestion.key`, `DiagAnswer.key`), et n'écrit que ce qui a réellement
 * changé. Le compte rendu NOMME chaque écriture — créée, mise à jour,
 * inchangée — comme l'import du master (src/server/kk/master.ts) : jamais un
 * simple compteur.
 *
 * Lancement : tsx scripts/installer-quiz-diagnostic.ts
 * (ce script charge lui-même .env.local puis .env — pas besoin de
 * --env-file).
 */
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";
import { besoinDuCodeRoutine } from "../src/lib/kk/diagnostic-matrice";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

// ---- 1. Étiquette de besoin des 14 routines du master ------------------------

interface ReglageBesoinTag {
  code: string;
  besoin: string;
}

export interface CompteRenduBesoinTag {
  /** Routine dont `besoinTag` a été écrit (créé ou corrigé). */
  misAJour: ReglageBesoinTag[];
  /** Routine déjà à jour — preuve d'idempotence. */
  inchanges: ReglageBesoinTag[];
  /** Routine du master dont le code n'appartient à aucun besoin de la
   *  matrice — SIGNALÉE, jamais écrite au hasard. Ne doit normalement
   *  jamais apparaître : les 14 codes du master couvrent exactement les
   *  sept besoins de la matrice, dans les deux niveaux. */
  sansCorrespondance: string[];
}

async function poserBesoinTagRoutines(): Promise<CompteRenduBesoinTag> {
  // Seules les routines du master portent un code (voir le commentaire de
  // Routine.code, prisma/schema.prisma) : les 5 routines historiques, sans
  // code, ne sont jamais touchées ici — leur besoinTag est déjà renseigné à
  // la main.
  const routines = await prisma.routine.findMany({
    where: { code: { not: null } },
    select: { id: true, code: true, besoinTag: true },
  });

  const compteRendu: CompteRenduBesoinTag = { misAJour: [], inchanges: [], sansCorrespondance: [] };

  for (const routine of routines) {
    const code = routine.code as string;
    const besoin = besoinDuCodeRoutine(code);
    if (!besoin) {
      compteRendu.sansCorrespondance.push(code);
      continue;
    }
    if (routine.besoinTag === besoin) {
      compteRendu.inchanges.push({ code, besoin });
      continue;
    }
    await prisma.routine.update({ where: { id: routine.id }, data: { besoinTag: besoin } });
    compteRendu.misAJour.push({ code, besoin });
  }

  return compteRendu;
}

// ---- 2. Désactivation des cinq questions actuelles ---------------------------

/** Clés des cinq questions actuelles (src/lib/kk/diagnostic.ts, QUESTIONS). */
const CLES_ANCIENNES_QUESTIONS = ["type", "concern", "sensitivity", "budget", "sun"];

export interface CompteRenduDesactivation {
  /** Question désactivée par ce passage (elle était active). */
  desactivees: string[];
  /** Question déjà inactive — preuve d'idempotence. */
  dejaInactives: string[];
  /** Clé attendue absente de la base — SIGNALÉE, jamais recréée : ce script
   *  ne crée jamais de question sous ces clés-là. */
  introuvables: string[];
}

async function desactiverAnciennesQuestions(): Promise<CompteRenduDesactivation> {
  const compteRendu: CompteRenduDesactivation = { desactivees: [], dejaInactives: [], introuvables: [] };

  for (const [index, cle] of CLES_ANCIENNES_QUESTIONS.entries()) {
    const question = await prisma.diagQuestion.findUnique({ where: { key: cle } });
    if (!question) {
      compteRendu.introuvables.push(cle);
      continue;
    }
    if (!question.active) {
      compteRendu.dejaInactives.push(cle);
      continue;
    }
    // Repoussée après les cinq nouvelles questions (positions 0-4), pour que
    // la liste d'administration (getAdminQuestionnaire, triée par position)
    // montre les questions actives d'abord, l'historique ensuite. Ni le
    // titre, ni le sous-titre, ni les réponses ne sont touchés : seuls
    // `active` et `position` le sont — l'historique reste lisible tel quel.
    await prisma.diagQuestion.update({
      where: { id: question.id },
      data: { active: false, position: 5 + index },
    });
    compteRendu.desactivees.push(cle);
  }

  return compteRendu;
}

// ---- 3. Les cinq questions du quiz client, et leurs réponses -----------------

interface ReponseSeed {
  key: string;
  label: string;
  description: string;
  icon: string;
  chip: string;
}

interface QuestionSeed {
  key: string;
  title: string;
  subtitle: string;
  reponses: ReponseSeed[];
}

/**
 * Les cinq questions du document du client. Les clés des réponses de Q2
 * (`priorite`) reprennent celles déjà anticipées par
 * src/lib/kk/diagnostic-conditions.test.ts (« Cas exact du quiz client » :
 * `boutons_imperfections`, `glow_eclat`) — c'est elles que Q5 cible dans sa
 * condition d'affichage, posée plus bas.
 */
const QUESTIONS_CLIENT: QuestionSeed[] = [
  {
    key: "peau",
    title: "En milieu de journée, votre peau a plutôt tendance à…",
    subtitle: "",
    reponses: [
      {
        key: "peau_grasse",
        label: "Briller sur l'ensemble du visage",
        description: "",
        icon: "droplet",
        chip: "Peau grasse",
      },
      {
        key: "peau_mixte",
        label: "Briller surtout sur le front, le nez et le menton, avec parfois les joues qui tiraillent",
        description: "",
        icon: "contrast",
        chip: "Peau mixte",
      },
      {
        key: "peau_seche",
        label: "Tirer, manquer de confort ou être rêche",
        description: "",
        icon: "wind",
        chip: "Peau sèche",
      },
      {
        key: "peau_normale",
        label: "Rester globalement confortable, sans excès de brillance ni tiraillement",
        description: "",
        icon: "smile",
        chip: "Peau normale",
      },
    ],
  },
  {
    key: "priorite",
    title: "Quelle est votre priorité aujourd'hui ?",
    subtitle: "",
    reponses: [
      {
        key: "taches_teint",
        label: "Taches / Teint",
        description: "Atténuer les taches brunes ou marques post-boutons et retrouver un teint plus uniforme.",
        icon: "contrast",
        chip: "",
      },
      {
        key: "boutons_imperfections",
        label: "Boutons / Imperfections",
        description: "Réduire les boutons, points noirs, pores obstrués et l'excès de sébum.",
        icon: "sparkles",
        chip: "",
      },
      {
        key: "glow_eclat",
        label: "Glow / Éclat",
        description: "Réveiller un teint terne et retrouver une peau plus lumineuse.",
        icon: "sun",
        chip: "",
      },
      {
        key: "hydratation_confort",
        label: "Hydratation / Confort",
        description: "Réduire les tiraillements et retrouver une peau plus souple et confortable.",
        icon: "droplet",
        chip: "",
      },
      {
        key: "anti_age",
        label: "Anti-âge",
        description: "Agir sur les ridules, rides, fermeté et signes visibles de l'âge.",
        icon: "clock",
        chip: "",
      },
    ],
  },
  {
    key: "reactivite",
    title: "Votre peau réagit-elle facilement aux soins ?",
    subtitle: "",
    reponses: [
      {
        key: "reactive",
        label: "Oui",
        description: "Elle peut picoter, chauffer, rougir ou devenir rapidement inconfortable.",
        icon: "shield",
        chip: "",
      },
      {
        key: "tolerante",
        label: "Non",
        description: "Elle tolère généralement bien les nouveaux produits.",
        icon: "check",
        chip: "",
      },
    ],
  },
  {
    key: "environnement",
    title: "Vous passez la majorité de vos journées…",
    subtitle: "",
    reponses: [
      {
        key: "climatisation",
        label: "Dans des espaces climatisés",
        description: "Bureau, voiture, maison…",
        icon: "wind",
        chip: "",
      },
      {
        key: "chaleur_humidite",
        label: "Dans la chaleur et l'humidité",
        description: "Extérieur, déplacements fréquents…",
        icon: "sun",
        chip: "",
      },
      {
        key: "mixte",
        label: "Un peu des deux",
        description: "",
        icon: "contrast",
        chip: "",
      },
    ],
  },
  {
    key: "pores",
    title: "Vos pores vous semblent-ils…",
    subtitle: "",
    reponses: [
      {
        key: "pores_visibles",
        label: "Visibles, dilatés ou parfois obstrués",
        description: "",
        icon: "sparkles",
        chip: "",
      },
      {
        key: "pores_reguliers",
        label: "Peu visibles et globalement réguliers",
        description: "",
        icon: "check",
        chip: "",
      },
    ],
  },
];

export interface CompteRenduQuestions {
  questionsCreees: string[];
  questionsMisesAJour: string[];
  questionsInchangees: string[];
  reponsesCreees: string[];
  reponsesMisesAJour: string[];
  reponsesInchangees: string[];
}

type AnswerActuelle = { id: string; label: string; description: string; icon: string; chip: string; position: number; active: boolean };

function reponseIdentique(actuelle: AnswerActuelle, attendue: ReponseSeed, position: number): boolean {
  return (
    actuelle.label === attendue.label &&
    actuelle.description === attendue.description &&
    actuelle.icon === attendue.icon &&
    actuelle.chip === attendue.chip &&
    actuelle.position === position &&
    actuelle.active
  );
}

async function poserQuestionsClient(): Promise<CompteRenduQuestions> {
  const compteRendu: CompteRenduQuestions = {
    questionsCreees: [],
    questionsMisesAJour: [],
    questionsInchangees: [],
    reponsesCreees: [],
    reponsesMisesAJour: [],
    reponsesInchangees: [],
  };

  for (const [index, q] of QUESTIONS_CLIENT.entries()) {
    const existante = await prisma.diagQuestion.findUnique({
      where: { key: q.key },
      include: { answers: true },
    });

    let questionId: string;
    if (!existante) {
      const cree = await prisma.diagQuestion.create({
        data: { key: q.key, title: q.title, subtitle: q.subtitle, position: index, active: true },
      });
      questionId = cree.id;
      compteRendu.questionsCreees.push(q.key);
    } else {
      questionId = existante.id;
      const contenuChange =
        existante.title !== q.title ||
        existante.subtitle !== q.subtitle ||
        existante.position !== index ||
        !existante.active;
      if (contenuChange) {
        await prisma.diagQuestion.update({
          where: { id: questionId },
          data: { title: q.title, subtitle: q.subtitle, position: index, active: true },
        });
        compteRendu.questionsMisesAJour.push(q.key);
      } else {
        compteRendu.questionsInchangees.push(q.key);
      }
    }

    const reponsesActuelles = new Map<string, AnswerActuelle>((existante?.answers ?? []).map((a) => [a.key, a]));

    for (const [ai, r] of q.reponses.entries()) {
      const actuelle = reponsesActuelles.get(r.key);
      if (!actuelle) {
        await prisma.diagAnswer.create({
          data: {
            questionId,
            key: r.key,
            label: r.label,
            description: r.description,
            icon: r.icon,
            chip: r.chip,
            position: ai,
            active: true,
          },
        });
        compteRendu.reponsesCreees.push(`${q.key}/${r.key}`);
        continue;
      }
      if (reponseIdentique(actuelle, r, ai)) {
        compteRendu.reponsesInchangees.push(`${q.key}/${r.key}`);
        continue;
      }
      await prisma.diagAnswer.update({
        where: { id: actuelle.id },
        data: { label: r.label, description: r.description, icon: r.icon, chip: r.chip, position: ai, active: true },
      });
      compteRendu.reponsesMisesAJour.push(`${q.key}/${r.key}`);
    }
  }

  return compteRendu;
}

// ---- Condition d'affichage de Q5 ---------------------------------------------

const CLE_QUESTION_Q5 = "pores";
const CLE_CONDITION_Q5 = "priorite";
const REPONSES_CONDITION_Q5 = ["boutons_imperfections", "glow_eclat"];

export interface CompteRenduConditionQ5 {
  modifiee: boolean;
  avant: { conditionQuestion: string; conditionReponses: string };
  apres: { conditionQuestion: string; conditionReponses: string };
}

async function poserConditionQ5(): Promise<CompteRenduConditionQ5> {
  const question = await prisma.diagQuestion.findUnique({ where: { key: CLE_QUESTION_Q5 } });
  if (!question) {
    throw new Error(
      `Question « ${CLE_QUESTION_Q5} » introuvable — poserQuestionsClient() doit avoir créé la question avant poserConditionQ5().`,
    );
  }

  const avant = { conditionQuestion: question.conditionQuestion, conditionReponses: question.conditionReponses };
  const apres = { conditionQuestion: CLE_CONDITION_Q5, conditionReponses: JSON.stringify(REPONSES_CONDITION_Q5) };
  const modifiee = avant.conditionQuestion !== apres.conditionQuestion || avant.conditionReponses !== apres.conditionReponses;

  if (modifiee) {
    await prisma.diagQuestion.update({ where: { id: question.id }, data: apres });
  }

  return { modifiee, avant, apres };
}

// ---- Point d'entrée -----------------------------------------------------------

export interface CompteRenduInstallation {
  besoinTag: CompteRenduBesoinTag;
  anciennesQuestions: CompteRenduDesactivation;
  questions: CompteRenduQuestions;
  conditionQ5: CompteRenduConditionQ5;
}

export async function installerQuizClient(): Promise<CompteRenduInstallation> {
  const besoinTag = await poserBesoinTagRoutines();
  const anciennesQuestions = await desactiverAnciennesQuestions();
  const questions = await poserQuestionsClient();
  const conditionQ5 = await poserConditionQ5();
  return { besoinTag, anciennesQuestions, questions, conditionQ5 };
}

async function main() {
  const compteRendu = await installerQuizClient();
  console.log(JSON.stringify(compteRendu, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
