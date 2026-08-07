/**
 * Les besoins par lesquels on peut entrer dans le catalogue.
 *
 * Chaque entrée pointe vers une étiquette réellement portée par des produits
 * (`Product.tags`, alimenté par scripts/build-kk-catalog.mjs) : sans quoi la
 * pastille mènerait à une page vide, ce qui est pire que pas de pastille.
 *
 * Deux registres, parce qu'ils ne répondent pas à la même question :
 *   — le TYPE de peau, qui ne change pas ;
 *   — la PRÉOCCUPATION du moment, qui elle change.
 *
 * « Taches & marques » figure en tête des préoccupations : sur les peaux
 * riches en mélanine, la moindre inflammation laisse une marque sombre qui
 * persiste des mois. C'est la première demande de cette clientèle.
 */

export type Besoin = {
  /** Étiquette stockée sur les produits. Sert de valeur au paramètre `besoin`. */
  tag: string;
  label: string;
  labelEn: string;
  /** Précision affichée sous le libellé, pour lever le doute au moment du choix. */
  hint: string;
  hintEn: string;
};

export const TYPES_DE_PEAU: Besoin[] = [
  {
    tag: "peau_seche",
    label: "Sèche",
    labelEn: "Dry",
    hint: "Tiraille, manque de confort",
    hintEn: "Tight, uncomfortable",
  },
  {
    tag: "peau_grasse",
    label: "Grasse",
    labelEn: "Oily",
    hint: "Brille, pores visibles",
    hintEn: "Shiny, visible pores",
  },
  {
    tag: "peau_mixte",
    label: "Mixte",
    labelEn: "Combination",
    hint: "Zone T grasse, joues sèches",
    hintEn: "Oily T-zone, dry cheeks",
  },
  {
    tag: "peau_sensible",
    label: "Sensible",
    labelEn: "Sensitive",
    hint: "Rougit, réagit vite",
    hintEn: "Reddens, reacts easily",
  },
];

export const PREOCCUPATIONS: Besoin[] = [
  {
    tag: "taches",
    label: "Taches & marques",
    labelEn: "Dark spots",
    hint: "Traces laissées par les boutons, le rasage, le soleil",
    hintEn: "Marks left by spots, shaving, sun",
  },
  {
    tag: "imperfections",
    label: "Imperfections",
    labelEn: "Blemishes",
    hint: "Boutons, points noirs",
    hintEn: "Spots, blackheads",
  },
  {
    tag: "eclat",
    label: "Manque d’éclat",
    labelEn: "Dullness",
    hint: "Teint terne, irrégulier",
    hintEn: "Dull, uneven tone",
  },
  {
    tag: "hydratation",
    label: "Hydratation",
    labelEn: "Hydration",
    hint: "Peau qui tire, qui pèle",
    hintEn: "Tight, flaking skin",
  },
];

const TOUS = [...TYPES_DE_PEAU, ...PREOCCUPATIONS];

/** Retrouve un besoin depuis le paramètre d'URL. Inconnu = filtre ignoré. */
export function besoinParTag(tag: string | undefined): Besoin | undefined {
  if (!tag) return undefined;
  return TOUS.find((b) => b.tag === tag);
}

/** Libellé dans la langue courante, pour l'étiquette de filtre actif. */
export function libelleBesoin(besoin: Besoin, locale: string): string {
  return locale === "en" ? besoin.labelEn : besoin.label;
}
