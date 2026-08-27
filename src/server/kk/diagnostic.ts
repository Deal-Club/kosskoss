import { prisma } from "@/server/prisma";
import { pickText, needsTranslation } from "@/server/localizedContent";
import { getRoutineByCode } from "./routines";
import {
  recommander,
  conseilTypePeau,
  conseilEnvironnement,
  MESSAGE_SECURITE,
  type Besoin,
  type Motif,
} from "@/lib/kk/diagnostic-matrice";
import type { KKRoutineView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

/**
 * Moteur de recommandation du Diagnostic Beauté.
 *
 * Il ne décide RIEN lui-même : toute la logique (quelle routine pour quelle
 * réponse, la bascule de sécurité, les conseils) vit dans
 * src/lib/kk/diagnostic-matrice.ts, la seule source de vérité (contrainte
 * globale n°1 du lot). Ce module se contente de :
 *  1. résoudre les identifiants de réponse reçus du navigateur en clés
 *     stables (DiagQuestion.key / DiagAnswer.key) ;
 *  2. les router vers `recommander()`, `conseilTypePeau()`, `conseilEnvironnement()` ;
 *  3. charger les deux routines retenues (par leur `Routine.code`) et les
 *     mettre en forme pour l'écran.
 */

/** Clés (DiagQuestion.key) des cinq questions du quiz client — voir
 *  scripts/installer-quiz-diagnostic.ts, seule autre source qui les nomme. */
const CLE_Q1_PEAU = "peau";
const CLE_Q2_PRIORITE = "priorite";
const CLE_Q3_REACTIVITE = "reactivite";
const CLE_Q4_ENVIRONNEMENT = "environnement";

/**
 * Réponse de Q2 (DiagAnswer.key) → Besoin de la matrice.
 *
 * Les clés des réponses de Q2 posées en base par `installerQuizClient()`
 * (scripts/installer-quiz-diagnostic.ts) ne reprennent pas toutes
 * littéralement un des sept `Besoin` — seule « anti_age » coïncide. Cette
 * table est un détail de câblage (le nom donné à une réponse en base), pas
 * une règle de décision : elle n'a donc pas sa place dans
 * diagnostic-matrice.ts, qui reste pur et sans connaissance de la base.
 */
const BESOIN_PAR_REPONSE_PRIORITE: Record<string, Besoin> = {
  taches_teint: "taches",
  boutons_imperfections: "imperfections",
  glow_eclat: "eclat",
  hydratation_confort: "hydratation",
  anti_age: "anti_age",
};

type ReponseChoisie = { key: string; label: string; description: string };

/** Les réponses choisies, une par question (clé de question → réponse). Une
 *  question sans réponse dans `answerIds` (absente, invisible, id inconnu)
 *  n'a simplement pas d'entrée — jamais une hypothèse sur ce qu'elle aurait
 *  valu. */
async function reponsesParQuestion(
  answerIds: string[],
  locale: Locale,
): Promise<Map<string, ReponseChoisie>> {
  const parQuestion = new Map<string, ReponseChoisie>();
  if (answerIds.length === 0) return parQuestion;

  const rows = await prisma.diagAnswer.findMany({
    where: { id: { in: answerIds } },
    include: { question: { select: { key: true } } },
  });
  const traduire = needsTranslation(locale);
  for (const a of rows) {
    parQuestion.set(a.question.key, {
      key: a.key,
      label: pickText(a.label, traduire ? a.labelEn : undefined),
      description: pickText(a.description, traduire ? a.descriptionEn : undefined),
    });
  }
  return parQuestion;
}

export type DiagnosticResult = {
  /** Type de peau déclaré (Q1) — libellé traduit, "" si absent. */
  peauLabel: string;
  /** Préoccupation déclarée (Q2) — libellé traduit tel que choisi, "" si
   *  absente. CONSERVÉE même quand la bascule de sécurité l'a emportée. */
  besoinDeclareLabel: string;
  /** Phrase de priorité — la description de la réponse Q2 choisie. */
  prioriteTexte: string;
  /** Réactivité déclarée (Q3) — libellé traduit choisi, "" si absente. */
  reactiviteLabel: string;
  /** Besoin réellement retenu pour la recommandation, après la bascule de
   *  sécurité éventuelle. `null` si aucune recommandation n'est possible
   *  (Q2 absente ou inconnue, et pas de bascule). */
  besoin: Besoin | null;
  /** D'où vient la recommandation. `null` si `besoin` est `null`. */
  motif: Motif | null;
  /** Message à afficher quand la bascule de sécurité s'est appliquée (texte
   *  exact du document du client) ; `null` sinon. */
  messageSecurite: string | null;
  /** Routine Essentielle du besoin retenu. `null` si elle n'existe pas ou
   *  n'est plus servable (voir getRoutineByCode) — l'écran le dit plutôt que
   *  d'en inventer une. */
  essentielle: KKRoutineView | null;
  /** Routine Premium du besoin retenu. Même règle que ci-dessus. */
  premium: KKRoutineView | null;
  /** Conseil selon le type de peau (Q1) — texte exact du document du client,
   *  "" si Q1 est absente. */
  conseilTypePeau: string;
  /** Conseil selon l'environnement (Q4) — texte exact du document du client,
   *  "" si Q4 est absente. */
  conseilEnvironnement: string;
};

/**
 * Calcule le résultat du Diagnostic Beauté à partir des identifiants de
 * réponse reçus (un `DiagAnswer.id` par question à laquelle le visiteur a
 * répondu — les questions restées invisibles n'y figurent simplement pas).
 */
export async function computeDiagnostic(
  answerIds: string[],
  locale: Locale = "fr",
): Promise<DiagnosticResult> {
  const parQuestion = await reponsesParQuestion(answerIds, locale);

  const q1 = parQuestion.get(CLE_Q1_PEAU);
  const q2 = parQuestion.get(CLE_Q2_PRIORITE);
  const q3 = parQuestion.get(CLE_Q3_REACTIVITE);
  const q4 = parQuestion.get(CLE_Q4_ENVIRONNEMENT);

  const resultat = recommander({
    q2: q2 ? BESOIN_PAR_REPONSE_PRIORITE[q2.key] : undefined,
    q3: q3?.key,
  });

  const [essentielle, premium] = await Promise.all([
    resultat.essentielle ? getRoutineByCode(resultat.essentielle, locale) : Promise.resolve(null),
    resultat.premium ? getRoutineByCode(resultat.premium, locale) : Promise.resolve(null),
  ]);

  return {
    peauLabel: q1?.label ?? "",
    besoinDeclareLabel: q2?.label ?? "",
    prioriteTexte: q2?.description ?? "",
    reactiviteLabel: q3?.label ?? "",
    besoin: resultat.besoin,
    motif: resultat.motif,
    messageSecurite: resultat.motif === "securite" ? MESSAGE_SECURITE[locale] : null,
    essentielle,
    premium,
    conseilTypePeau: conseilTypePeau(q1?.key, locale),
    conseilEnvironnement: conseilEnvironnement(q4?.key, locale),
  };
}
