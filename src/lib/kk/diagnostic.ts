/**
 * Diagnostic Beauté KossKoss — questionnaire et agrégation de profil.
 * Module partagé client (parcours) / serveur (moteur de recommandation).
 *
 * Chaque réponse attribue des tags pondérés au profil. Le moteur
 * (src/server/kk/diagnostic.ts) score ensuite les produits par correspondance.
 * ⚠️ Version code-first : à terme, questions/tags gérables depuis le back-office
 * (CDC §5.3).
 */

export type DiagIcon =
  | "droplet"
  | "wind"
  | "smile"
  | "contrast"
  | "sparkles"
  | "sun"
  | "clock"
  | "shield"
  | "wallet"
  | "gem"
  | "leaf"
  | "check";

export type DiagAnswer = {
  id: string;
  label: string;
  description: string;
  icon: DiagIcon;
  /** Tags pondérés ajoutés au profil si la réponse est choisie. */
  tags: Record<string, number>;
  /** Étiquette affichée dans « votre profil » (facultative). */
  chip?: string;
};

export type DiagQuestion = {
  id: string;
  title: string;
  subtitle: string;
  answers: DiagAnswer[];
};

export const QUESTIONS: DiagQuestion[] = [
  {
    id: "type",
    title: "Comment décririez-vous votre peau en fin de journée ?",
    subtitle: "Choisissez l'option qui correspond le mieux à votre ressenti habituel.",
    answers: [
      { id: "type_brillante", label: "Brillante", description: "Film gras, pores dilatés sur la zone T.", icon: "droplet", tags: { peau_grasse: 3, matifiant: 1, imperfections: 1 }, chip: "Peau grasse" },
      { id: "type_tiraillee", label: "Tiraillée", description: "Inconfort, sensation de peau sèche.", icon: "wind", tags: { peau_seche: 3, hydratation: 2 }, chip: "Peau sèche" },
      { id: "type_confortable", label: "Confortable", description: "Ni trop grasse, ni trop sèche.", icon: "smile", tags: { peau_normale: 2, hydratation: 1 }, chip: "Peau normale" },
      { id: "type_mixte", label: "Mixte", description: "Grasse sur la zone T, sèche sur les joues.", icon: "contrast", tags: { peau_mixte: 3, matifiant: 1, hydratation: 1 }, chip: "Peau mixte" },
    ],
  },
  {
    id: "concern",
    title: "Quelle est votre préoccupation n°1 ?",
    subtitle: "Nous prioriserons les soins qui la ciblent.",
    answers: [
      { id: "concern_imperfections", label: "Imperfections & boutons", description: "Points noirs, brillance, petits boutons.", icon: "sparkles", tags: { imperfections: 3, matifiant: 1, peau_grasse: 1 }, chip: "Tendance imperfections" },
      { id: "concern_eclat", label: "Manque d'éclat", description: "Teint terne, irrégulier.", icon: "sun", tags: { eclat: 3, anti_age: 1 }, chip: "Éclat" },
      { id: "concern_age", label: "Rides & fermeté", description: "Premiers signes de l'âge.", icon: "clock", tags: { anti_age: 3, eclat: 1 }, chip: "Anti-âge" },
      { id: "concern_hydratation", label: "Déshydratation", description: "Tiraillements, peau qui pèle.", icon: "droplet", tags: { hydratation: 3, peau_seche: 1 }, chip: "Hydratation" },
    ],
  },
  {
    id: "sensitivity",
    title: "Votre peau est-elle sensible ?",
    subtitle: "Rougeurs, picotements, réactions aux produits.",
    answers: [
      { id: "sensitivity_high", label: "Très réactive", description: "Rougeurs fréquentes, tiraillements.", icon: "shield", tags: { peau_sensible: 3, apaisant: 2 }, chip: "Sensibilité" },
      { id: "sensitivity_mid", label: "Un peu", description: "Réactions occasionnelles.", icon: "leaf", tags: { peau_sensible: 1, apaisant: 1 }, chip: "Sensibilité modérée" },
      { id: "sensitivity_none", label: "Pas du tout", description: "Ma peau tolère bien les produits.", icon: "check", tags: {} },
    ],
  },
  {
    id: "budget",
    title: "Quel budget par produit vous convient ?",
    subtitle: "Nous adapterons la sélection à vos moyens.",
    answers: [
      { id: "budget_eco", label: "Accessible", description: "L'efficacité sans se ruiner.", icon: "wallet", tags: { budget_eco: 3 }, chip: "Budget malin" },
      { id: "budget_mid", label: "Équilibré", description: "Le meilleur rapport qualité-prix.", icon: "check", tags: {} },
      { id: "budget_premium", label: "Premium", description: "Le haut de gamme, sans compromis.", icon: "gem", tags: { premium: 3 }, chip: "Premium" },
    ],
  },
  {
    id: "sun",
    title: "Et la protection solaire ?",
    subtitle: "Le soleil est le premier facteur de vieillissement de la peau.",
    answers: [
      { id: "sun_daily", label: "Tous les jours", description: "C'est déjà un réflexe.", icon: "sun", tags: { anti_age: 1 } },
      { id: "sun_sometimes", label: "De temps en temps", description: "Surtout en saison chaude.", icon: "check", tags: {} },
      { id: "sun_sensitive", label: "Ma peau craint le soleil", description: "Rougeurs, sensibilité au soleil.", icon: "shield", tags: { peau_sensible: 1 } },
    ],
  },
];

export type DiagProfile = { tags: Record<string, number>; chips: string[] };

/** Agrège les réponses choisies en un profil (tags pondérés + étiquettes). */
export function aggregateProfile(answerIds: readonly string[]): DiagProfile {
  const selected = new Set(answerIds);
  const tags: Record<string, number> = {};
  const chips: string[] = [];
  for (const q of QUESTIONS) {
    const answer = q.answers.find((a) => selected.has(a.id));
    if (!answer) continue;
    for (const [tag, weight] of Object.entries(answer.tags)) {
      tags[tag] = (tags[tag] ?? 0) + weight;
    }
    if (answer.chip) chips.push(answer.chip);
  }
  return { tags, chips };
}
