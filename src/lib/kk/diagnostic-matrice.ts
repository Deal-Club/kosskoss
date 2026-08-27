// Matrice de décision du Diagnostic Beauté — module pur, sans accès base de
// données.
//
// Source : assets/corrections/Quiz Diagnostic Peau KossKoss Select_complète.docx
// (tableau « Q2 – Priorité », tableau « Règle spéciale : peau sensible »,
// tableau « Q1 / Profil / Ajustement du conseil », et la section « Q4 sert à
// générer un conseil »).
//
// Ce module est la SEULE source de vérité pour :
//  - la correspondance réponse à Q2 → besoin → codes de routine du master
//    (voir Routine.code, prisma/schema.prisma) ;
//  - la bascule de sécurité de Q3 (peau réactive) ;
//  - les conseils contextuels de Q1 (type de peau) et Q4 (environnement).
// Le moteur (src/server/kk/diagnostic.ts, tâche 3 de ce lot) LIT ce module ;
// il ne recopie jamais ces règles ni ces textes ailleurs — les recopier dans
// un écran créerait deux vérités (contrainte globale n°1 du lot).

/** Les sept besoins du client, chacun relié à deux routines du master. */
export type Besoin =
  | "taches"
  | "imperfections"
  | "eclat"
  | "hydratation"
  | "anti_age"
  | "sensibilite"
  | "homme";

export interface CodesRoutine {
  /** Routine.code (master) de la version Essentielle du besoin. */
  essentielle: string;
  /** Routine.code (master) de la version Premium du besoin. */
  premium: string;
}

/**
 * Matrice principale : les sept besoins et leurs deux routines.
 *
 * `sensibilite` (BAR-*) n'est jamais désigné directement par une réponse à
 * Q2 — il n'y arrive que par la bascule de sécurité de Q3, voir
 * `recommander`. `homme` (HOM-*) est hors quiz (aucune réponse ne l'atteint
 * aujourd'hui) : il reste dans la matrice pour un lien direct futur vers la
 * routine homme, et parce que le master l'exige exister pour les 14
 * routines.
 */
export const MATRICE: Record<Besoin, CodesRoutine> = {
  taches: { essentielle: "TAC-ECO", premium: "TAC-PREM" },
  imperfections: { essentielle: "IMP-ECO", premium: "IMP-PREM" },
  eclat: { essentielle: "GLO-ECO", premium: "GLO-PREM" },
  hydratation: { essentielle: "HYD-ECO", premium: "HYD-PREM" },
  anti_age: { essentielle: "AGE-ECO", premium: "AGE-PREM" },
  sensibilite: { essentielle: "BAR-ECO", premium: "BAR-PREM" },
  homme: { essentielle: "HOM-ECO", premium: "HOM-PREM" },
};

/**
 * Retrouve le besoin d'un code de routine du master (ex. « TAC-ECO » →
 * `taches`), en LISANT la matrice ci-dessus plutôt qu'en recopiant une
 * seconde table de correspondance — c'est elle qui pose l'étiquette de
 * besoin des 14 routines importées du master (tâche 2 de ce lot). `null` si
 * le code n'appartient à aucun besoin de la matrice.
 */
export function besoinDuCodeRoutine(code: string): Besoin | null {
  for (const [besoin, codes] of Object.entries(MATRICE) as [Besoin, CodesRoutine][]) {
    if (codes.essentielle === code || codes.premium === code) return besoin;
  }
  return null;
}

/** Les cinq besoins qu'une réponse à Q2 peut désigner. */
const BESOINS_Q2: readonly Besoin[] = ["taches", "imperfections", "eclat", "hydratation", "anti_age"];

function estBesoinQ2(valeur: string | undefined): valeur is Besoin {
  return valeur !== undefined && (BESOINS_Q2 as readonly string[]).includes(valeur);
}

/** D'où vient la recommandation : la préoccupation déclarée à Q2, ou la
 *  bascule de sécurité de Q3. */
export type Motif = "preoccupation" | "securite";

export interface ReponsesDiagnostic {
  /** Réponse à Q2 (priorité) — un des cinq besoins de `BESOINS_Q2`. Absente
   *  ou étrangère à cette liste : traitée comme une réponse manquante, jamais
   *  comme une hypothèse sur ce que le visiteur aurait voulu dire. */
  q2?: string;
  /** Réponse à Q3 (réactivité) — "reactive" déclenche la bascule de
   *  sécurité. Toute autre valeur, y compris absente ou étrangère à
   *  "reactive"/"tolerante", NE déclenche rien : une réponse illisible ne
   *  doit jamais se faire passer pour une alerte de sécurité qu'elle n'est
   *  pas. */
  q3?: "reactive" | "tolerante" | string;
}

export interface Recommandation {
  /** Besoin retenu pour la recommandation. `null` quand Q2 est absente ou
   *  inconnue ET que la bascule de sécurité ne s'est pas déclenchée :
   *  aucune routine n'est alors proposée plutôt que d'en inventer une. */
  besoin: Besoin | null;
  /** Routine.code de la version Essentielle du besoin retenu (`null` si
   *  `besoin` est `null`). */
  essentielle: string | null;
  /** Routine.code de la version Premium du besoin retenu (`null` si
   *  `besoin` est `null`). */
  premium: string | null;
  /** Motif de la recommandation. `null` si aucune recommandation n'est
   *  possible. */
  motif: Motif | null;
  /** La préoccupation que le visiteur a déclarée à Q2 — CONSERVÉE même
   *  quand la bascule de sécurité l'a emporté, pour que l'écran puisse dire
   *  « nous traitons d'abord la sensibilité, avant votre préoccupation »
   *  plutôt que d'avoir l'air de s'être trompé (contrainte globale n°2).
   *  `null` si Q2 est absente ou inconnue. */
  preoccupationDeclaree: Besoin | null;
}

/**
 * Calcule la recommandation à partir des réponses à Q2 et Q3.
 *
 * LA BASCULE DE SÉCURITÉ PRIME SUR LA PRÉOCCUPATION DÉCLARÉE : si Q3 vaut
 * "reactive", le besoin retenu devient `sensibilite`, QUELLE QUE SOIT la
 * réponse à Q2 — y compris absente ou inconnue. Ce n'est pas un bonus de
 * score qu'un autre critère pourrait dépasser : c'est une bascule, évaluée
 * en premier, avant toute tentative de résoudre Q2.
 */
export function recommander(reponses: ReponsesDiagnostic): Recommandation {
  const preoccupationDeclaree: Besoin | null = estBesoinQ2(reponses.q2) ? reponses.q2 : null;

  if (reponses.q3 === "reactive") {
    return {
      besoin: "sensibilite",
      essentielle: MATRICE.sensibilite.essentielle,
      premium: MATRICE.sensibilite.premium,
      motif: "securite",
      preoccupationDeclaree,
    };
  }

  if (preoccupationDeclaree === null) {
    return { besoin: null, essentielle: null, premium: null, motif: null, preoccupationDeclaree: null };
  }

  return {
    besoin: preoccupationDeclaree,
    essentielle: MATRICE[preoccupationDeclaree].essentielle,
    premium: MATRICE[preoccupationDeclaree].premium,
    motif: "preoccupation",
    preoccupationDeclaree,
  };
}

// ---- Conseils contextuels — textes exacts du document du client -------------
//
// Ce sont des conseils de soin, pas des formulations à améliorer : ils sont
// recopiés mot pour mot depuis le document du client, sans reformulation.

/** Réponse à Q1 (type de peau), telle qu'encodée par `ProductTag`
 *  (src/lib/kk/besoins.ts, famille « peau »). */
export type ReponseQ1 = "peau_grasse" | "peau_mixte" | "peau_seche" | "peau_normale";

/** Docx, tableau « Q1 / Profil / Ajustement du conseil ». Le français est le
 *  texte exact du document ; l'anglais est notre traduction pour /en. */
const CONSEILS_TYPE_PEAU: Record<ReponseQ1, { fr: string; en: string }> = {
  peau_grasse: {
    fr: "Textures légères, limiter les produits trop riches",
    en: "Light textures, limit overly rich products",
  },
  peau_mixte: {
    fr: "Équilibrer sébum + hydratation",
    en: "Balance sebum + hydration",
  },
  peau_seche: {
    fr: "Renforcer confort et hydratation",
    en: "Reinforce comfort and hydration",
  },
  peau_normale: {
    fr: "Routine équilibrée, pas de correction particulière",
    en: "Balanced routine, no particular correction needed",
  },
};

/**
 * Ajustement du conseil selon le type de peau (Q1) — texte exact du document
 * du client. Une réponse absente ou inconnue rend une chaîne vide plutôt
 * qu'un texte inventé.
 */
export function conseilTypePeau(reponseQ1: string | undefined, locale: "fr" | "en" = "fr"): string {
  if (reponseQ1 !== undefined && Object.prototype.hasOwnProperty.call(CONSEILS_TYPE_PEAU, reponseQ1)) {
    return CONSEILS_TYPE_PEAU[reponseQ1 as ReponseQ1][locale];
  }
  return "";
}

/** Réponse à Q4 (environnement). */
export type ReponseQ4 = "climatisation" | "chaleur_humidite" | "mixte";

/** Docx, section « Q4 sert à générer un conseil suivant la réponse
 *  donnée » — les trois textes complets, hors le libellé « Conseil
 *  KossKoss : » qui est l'habillage constant de l'écran (même convention que
 *  `Product.conseilKossKoss`, voir src/lib/kk/traductions.ts). */
const CONSEILS_ENVIRONNEMENT: Record<ReponseQ4, { fr: string; en: string }> = {
  climatisation: {
    fr: "la climatisation peut accentuer la déshydratation et les tiraillements. Ne négligez pas l'hydratation, même avec une peau mixte ou grasse.",
    en: "air conditioning can worsen dehydration and tightness. Don't neglect hydration, even with combination or oily skin.",
  },
  chaleur_humidite: {
    fr: "sous climat chaud et humide, privilégiez des textures légères et conservez votre protection solaire chaque matin.",
    en: "in a hot and humid climate, favour light textures and keep your sun protection on every morning.",
  },
  mixte: {
    fr: "votre peau alterne chaleur extérieure et climatisation. L'objectif est de maintenir l'hydratation sans surcharger la peau.",
    en: "your skin alternates between outdoor heat and air conditioning. The goal is to maintain hydration without overloading the skin.",
  },
};

/**
 * Conseil selon l'environnement (Q4) — texte exact du document du client.
 * Une réponse absente ou inconnue rend une chaîne vide plutôt qu'un texte
 * inventé.
 */
export function conseilEnvironnement(reponseQ4: string | undefined, locale: "fr" | "en" = "fr"): string {
  if (reponseQ4 !== undefined && Object.prototype.hasOwnProperty.call(CONSEILS_ENVIRONNEMENT, reponseQ4)) {
    return CONSEILS_ENVIRONNEMENT[reponseQ4 as ReponseQ4][locale];
  }
  return "";
}

/**
 * Message affiché quand la bascule de sécurité s'applique — texte exact du
 * document du client (entre guillemets dans l'original, retirés ici).
 * Exporté pour que l'écran (tâche 3) ne le recopie jamais : une seule source
 * de vérité pour ce texte, comme pour le reste de la matrice.
 */
export const MESSAGE_SECURITE: Record<"fr" | "en", string> = {
  fr: "Votre peau semble réactive. Avant d'intensifier le traitement de votre préoccupation, nous vous recommandons de privilégier une routine courte qui apaise et soutient la barrière cutanée",
  en: "Your skin appears reactive. Before intensifying the treatment of your concern, we recommend favouring a short routine that soothes and supports the skin barrier",
};
