/**
 * Les sept besoins auxquels les routines du master répondent.
 *
 * ── POURQUOI UN REGISTRE À PART DE `besoins.ts` ─────────────────────────────
 *
 * `src/lib/kk/besoins.ts` sert les FACETTES du catalogue : ses entrées sont des
 * étiquettes que portent les PRODUITS, et son vocabulaire est celui du filtre.
 * Il ne couvre que quatre préoccupations et quatre types de peau.
 *
 * Les routines, elles, répondent à sept besoins, dont trois qu'aucune facette
 * ne nomme : l'anti-âge, la sensibilité et l'essentiel homme. Et surtout, le
 * client les a nommés lui-même dans son fichier maître, avec ses mots :
 * « Taches / Teint », « Boutons / Imperfections », « Glow / Éclat ». Ce sont ces
 * mots-là qui doivent coiffer chaque groupe de la page, pas une reformulation.
 *
 * Fondre les deux registres reviendrait donc soit à imposer le vocabulaire du
 * filtre à la page des routines, soit à polluer le filtre de trois entrées qui
 * n'y ont pas de produit. Deux usages, deux registres.
 *
 * ── L'ORDRE N'EST PAS ALPHABÉTIQUE ──────────────────────────────────────────
 *
 * Il suit celui du questionnaire du client : les cinq préoccupations qu'il fait
 * choisir en question 2, puis la sensibilité, qui est une bascule de sécurité
 * et non une préoccupation qu'on déclare, puis l'homme, qui est une gamme.
 */

export interface BesoinRoutine {
  /** Valeur de `Routine.besoinTag`, posée par l'import du master. */
  tag: string;
  label: string;
  labelEn: string;
}

export const BESOINS_ROUTINES: readonly BesoinRoutine[] = [
  { tag: "taches", label: "Taches & teint", labelEn: "Dark spots & tone" },
  { tag: "imperfections", label: "Boutons & imperfections", labelEn: "Spots & blemishes" },
  { tag: "eclat", label: "Éclat", labelEn: "Glow" },
  { tag: "hydratation", label: "Hydratation & confort", labelEn: "Hydration & comfort" },
  { tag: "anti_age", label: "Anti-âge", labelEn: "Anti-ageing" },
  { tag: "sensibilite", label: "Sensibilité & barrière", labelEn: "Sensitivity & barrier" },
  { tag: "homme", label: "Homme", labelEn: "Men" },
];

/** Libellé du besoin dans la langue demandée, repli sur le français. */
export function libelleBesoinRoutine(besoin: BesoinRoutine, locale: string): string {
  return locale === "en" && besoin.labelEn.trim() ? besoin.labelEn : besoin.label;
}

/**
 * Regroupe des routines par besoin, dans l'ordre du registre.
 *
 * ── CE QUE CETTE FONCTION GARANTIT, ET POURQUOI ─────────────────────────────
 *
 * Un besoin sans aucune routine ne produit PAS de groupe : un intertitre suivi
 * du vide se lit comme une panne d'affichage, pas comme une absence d'offre.
 *
 * Un besoin que le registre ne connaît pas n'est pas perdu pour autant : il
 * forme son propre groupe, placé après les sept, avec son étiquette brute pour
 * libellé. Le jour où le client ajoute un huitième besoin à son fichier, ses
 * routines s'affichent — mal nommées, ce qui se voit et se corrige — plutôt que
 * de disparaître sans bruit, ce qui ne se voit pas.
 */
export function grouperParBesoin<T extends { besoinTag: string }>(
  routines: readonly T[],
): { besoin: BesoinRoutine; routines: T[] }[] {
  const groupes: { besoin: BesoinRoutine; routines: T[] }[] = [];

  for (const besoin of BESOINS_ROUTINES) {
    const membres = routines.filter((routine) => routine.besoinTag === besoin.tag);
    if (membres.length > 0) groupes.push({ besoin, routines: membres });
  }

  const connus = new Set(BESOINS_ROUTINES.map((besoin) => besoin.tag));
  const inconnus = new Map<string, T[]>();
  for (const routine of routines) {
    if (connus.has(routine.besoinTag)) continue;
    const liste = inconnus.get(routine.besoinTag) ?? [];
    liste.push(routine);
    inconnus.set(routine.besoinTag, liste);
  }
  for (const [tag, membres] of inconnus) {
    groupes.push({ besoin: { tag, label: tag, labelEn: tag }, routines: membres });
  }

  return groupes;
}

/**
 * Range les routines d'un groupe : l'essentielle avant la premium.
 *
 * C'est l'ordre de lecture attendu, du plus simple au plus complet, et celui
 * dans lequel le client présente ses deux niveaux. Toute autre valeur de niveau
 * se range après, sans être écartée.
 */
export function ordonnerParNiveau<T extends { niveau: string }>(routines: readonly T[]): T[] {
  const rang = (niveau: string) => (niveau === "eco" ? 0 : niveau === "premium" ? 1 : 2);
  return [...routines].sort((a, b) => rang(a.niveau) - rang(b.niveau));
}
