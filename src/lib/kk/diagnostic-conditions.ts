// Visibilité conditionnelle d'une question du Diagnostic Beauté — module pur,
// sans accès base de données.
//
// Le quiz du client (Quiz Diagnostic Peau KossKoss Select_complète.docx)
// porte une question qui ne s'affiche que si une réponse précise a été
// donnée à une question antérieure : « Q5 apparaît uniquement si Q2 =
// "Boutons / Imperfections" ou "Glow / Éclat" ». `DiagQuestion.conditionQuestion`
// / `conditionReponses` (voir prisma/schema.prisma) portent cette règle en
// base ; ce module l'évalue.

/** Les deux colonnes de condition, telles que stockées sur DiagQuestion. */
export interface QuestionAvecCondition {
  /** Clé (DiagQuestion.key) de la question dont dépend l'affichage. Vide = toujours affichée. */
  conditionQuestion: string;
  /** Clés (DiagAnswer.key) qui déclenchent l'affichage, encodées en JSON. */
  conditionReponses: string;
}

/** Décode `conditionReponses`. Une valeur illisible ou mal formée redevient
 *  une liste vide plutôt que de faire échouer l'évaluation : voir `questionVisible`. */
function parseConditionReponses(valeur: string): string[] {
  try {
    const v: unknown = JSON.parse(valeur);
    if (Array.isArray(v)) {
      return v.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

/**
 * Une question est visible quand :
 *  - sa condition est vide (`conditionQuestion` vide) — c'est le cas de
 *    toutes les questions aujourd'hui en base ;
 *  - ou l'une des réponses attendues (`conditionReponses`) figure parmi les
 *    clés de réponses déjà données (`reponsesDonnees`).
 *
 * Une condition qui porte sur une question à laquelle on n'a pas encore
 * répondu, ou dont `conditionReponses` est illisible en base, rend la
 * question INVISIBLE plutôt que de faire une hypothèse sur ce qu'aurait
 * répondu le visiteur — une condition cassée doit se taire, pas s'afficher
 * à tort.
 */
export function questionVisible(
  question: QuestionAvecCondition,
  reponsesDonnees: ReadonlySet<string> | readonly string[],
): boolean {
  const cle = question.conditionQuestion.trim();
  if (!cle) return true;

  const attendues = parseConditionReponses(question.conditionReponses);
  if (attendues.length === 0) return false;

  const donnees = reponsesDonnees instanceof Set ? reponsesDonnees : new Set(reponsesDonnees);
  return attendues.some((r) => donnees.has(r));
}
