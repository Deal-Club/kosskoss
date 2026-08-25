/**
 * Lecture de l'ARBRE DU DIAGNOSTIC pour le back-office : pour chaque réponse à
 * la question de priorité (Q2), quel besoin elle désigne, et quelles routines
 * (Essentielle / Premium) en sortent, avec l'état de chacune.
 *
 * C'est une VUE, pas une seconde vérité : elle relit les mêmes sources que le
 * moteur — `BESOIN_PAR_REPONSE_PRIORITE` (réponse → besoin), `MATRICE` (besoin
 * → codes de routine) et les routines en base. Elle ne recopie aucune règle.
 */
import { prisma } from "@/server/prisma";
import { getQuestions } from "./diagnostic-data";
import { BESOIN_PAR_REPONSE_PRIORITE } from "./diagnostic";
import { MATRICE, type Besoin } from "@/lib/kk/diagnostic-matrice";
import type { Locale } from "@/i18n/routing";

/** Clé (DiagQuestion.key) de la question de priorité — celle qui décide du besoin. */
const CLE_Q2 = "priorite";

/** Libellés lisibles des sept besoins de la matrice. */
export const BESOIN_LABEL: Record<Besoin, string> = {
  taches: "Taches & marques",
  imperfections: "Imperfections",
  eclat: "Éclat",
  hydratation: "Hydratation",
  anti_age: "Anti-âge",
  sensibilite: "Sensibilité",
  homme: "Homme",
};

export type StatutRoutine = "complete" | "incomplete" | "vide";

export type ArbreRoutine = {
  niveau: "Essentielle" | "Premium";
  /** Code du master (ex. « TAC-ECO »). */
  code: string;
  /** Nom de la routine, `null` si aucune routine ne porte ce code en base. */
  nom: string | null;
  produits: { nom: string; servable: boolean }[];
  /** Nombre de produits actifs ET en stock. */
  servables: number;
  /**
   * `complete`  : au moins 2 produits servables → s'affiche au client.
   * `incomplete`: 1 seul produit servable → ne s'affiche PAS (une routine
   *               exige au moins 2 gestes) : à compléter.
   * `vide`      : aucune routine, ou routine inactive, ou 0 produit servable.
   */
  statut: StatutRoutine;
};

export type ArbreBranche = {
  reponseId: string;
  reponseLabel: string;
  reponseKey: string;
  /** `null` si cette réponse n'est reliée à aucun besoin (donc aucune reco). */
  besoin: Besoin | null;
  besoinLabel: string | null;
  routines: ArbreRoutine[];
};

export type ArbreDiagnostic = {
  questionExiste: boolean;
  questionTitre: string | null;
  branches: ArbreBranche[];
  /** Branche de la règle spéciale : Q3 « peau réactive » → Sensibilité. */
  securite: { besoin: Besoin; besoinLabel: string; routines: ArbreRoutine[] };
};

async function chargerRoutine(
  code: string,
  niveau: "Essentielle" | "Premium",
): Promise<ArbreRoutine> {
  const row = await prisma.routine.findFirst({
    where: { code },
    include: {
      steps: {
        orderBy: { position: "asc" },
        include: { product: { select: { name: true, active: true, stock: true } } },
      },
    },
  });

  if (!row) {
    return { niveau, code, nom: null, produits: [], servables: 0, statut: "vide" };
  }

  const produits = row.steps.map((s) => ({
    nom: s.product.name,
    servable: s.product.active && s.product.stock > 0,
  }));
  const servables = produits.filter((p) => p.servable).length;
  const statut: StatutRoutine =
    !row.active || servables === 0 ? "vide" : servables < 2 ? "incomplete" : "complete";

  return { niveau, code, nom: row.name || row.slug, produits, servables, statut };
}

function routinesDuBesoin(besoin: Besoin): Promise<ArbreRoutine[]> {
  const codes = MATRICE[besoin];
  return Promise.all([
    chargerRoutine(codes.essentielle, "Essentielle"),
    chargerRoutine(codes.premium, "Premium"),
  ]);
}

export async function lireArbreDiagnostic(locale: Locale = "fr"): Promise<ArbreDiagnostic> {
  const questions = await getQuestions(locale);
  const q2 = questions.find((q) => q.key === CLE_Q2);

  const branches: ArbreBranche[] = [];
  if (q2) {
    for (const a of q2.answers) {
      const besoin = BESOIN_PAR_REPONSE_PRIORITE[a.key];
      branches.push({
        reponseId: a.id,
        reponseLabel: a.label,
        reponseKey: a.key,
        besoin: besoin ?? null,
        besoinLabel: besoin ? BESOIN_LABEL[besoin] : null,
        routines: besoin ? await routinesDuBesoin(besoin) : [],
      });
    }
  }

  return {
    questionExiste: Boolean(q2),
    questionTitre: q2?.title ?? null,
    branches,
    securite: {
      besoin: "sensibilite",
      besoinLabel: BESOIN_LABEL.sensibilite,
      routines: await routinesDuBesoin("sensibilite"),
    },
  };
}
