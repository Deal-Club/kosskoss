/**
 * Réglages de la boutique modifiables en administration.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * Le formulaire d'administration est un composant client : il ne peut pas
 * importer un module qui tire Prisma. Types, valeurs par défaut et normalisation
 * vivent donc ici, et `src/server/kk/parametres.ts` les réexporte pour que les
 * appelants serveur n'aient qu'un import à faire. C'est exactement ce que fait
 * déjà `src/server/announcements.ts` pour le bandeau d'annonces.
 *
 * ── CE QUI N'A PAS SA PLACE ICI ─────────────────────────────────────────────
 *
 * Aucun secret. Ces valeurs partent dans le HTML ou dans un lien cliquable ;
 * le jeton de l'API Conversions, lui, doit rester au serveur et va dans
 * `Integration`, qui le chiffre.
 */

export interface ParametresBoutique {
  /** Numéro WhatsApp de la boutique, en chiffres seuls. */
  whatsapp: string;
  /** Lien du formulaire d'évaluation, envoyé au client après livraison. */
  formulaireEvaluation: string;
  /** Identifiant de mesure GA4. */
  ga4: string;
  /** Identifiant du Pixel Meta. */
  metaPixel: string;
}

/**
 * Tout est vide par défaut, et c'est voulu : une boutique qui n'a pas encore de
 * Pixel doit pouvoir enregistrer les trois autres réglages.
 */
export const PARAMETRES_PAR_DEFAUT: ParametresBoutique = {
  whatsapp: "",
  formulaireEvaluation: "",
  ga4: "",
  metaPixel: "",
};

/** `wa.me` n'accepte que des chiffres : une lettre produirait un lien mort. */
export function numeroWhatsappValide(valeur: string): boolean {
  return valeur === "" || /^\d{6,20}$/.test(valeur);
}

/**
 * Ce lien part au client par WhatsApp. `https` est exigé : on ne l'emmène pas
 * sur une page non chiffrée.
 */
export function lienEvaluationValide(valeur: string): boolean {
  return valeur === "" || /^https:\/\/\S+$/.test(valeur);
}

/**
 * Identifiant de mesure GA4, de la forme « G-XXXXXXXXXX ».
 *
 * Le motif n'atteste pas que le compte existe — rien ne le peut depuis un
 * formulaire. Il attrape la faute de frappe, qui est le cas réel : une mesure
 * qui ne remonte pas ne se signale jamais d'elle-même.
 */
export function identifiantGa4Valide(valeur: string): boolean {
  return valeur === "" || /^G-[A-Z0-9]{6,12}$/.test(valeur);
}

/** Identifiant du Pixel Meta : une suite de chiffres. */
export function identifiantPixelValide(valeur: string): boolean {
  return valeur === "" || /^\d{8,20}$/.test(valeur);
}

/**
 * Description partagée de chaque champ : son validateur et le message de
 * format qu'un échec doit afficher.
 *
 * La route d'enregistrement et l'écran d'administration important tous les
 * deux CETTE table plutôt que d'en tenir chacun une copie manuscrite — deux
 * copies avaient déjà divergé une fois (le Pixel Meta : « 8 à 20 chiffres »
 * côté route, « une suite de chiffres » côté écran, qui ne dit pas pourquoi
 * cinq chiffres sont refusés).
 */
export interface DescriptionChamp {
  cle: keyof ParametresBoutique;
  valide: (valeur: string) => boolean;
  format: string;
}

export const CHAMPS_PARAMETRES: DescriptionChamp[] = [
  {
    cle: "whatsapp",
    valide: numeroWhatsappValide,
    format: "6 à 20 chiffres, indicatif compris (ex. 237658013646)",
  },
  {
    cle: "formulaireEvaluation",
    valide: lienEvaluationValide,
    format: "une adresse https (ex. https://forms.gle/...)",
  },
  { cle: "ga4", valide: identifiantGa4Valide, format: "G-XXXXXXXXXX" },
  { cle: "metaPixel", valide: identifiantPixelValide, format: "8 à 20 chiffres" },
];

/**
 * La normalisation a-t-elle effacé une saisie qui n'était pas vide ?
 *
 * `whatsapp` est aujourd'hui le seul champ dont la normalisation SUPPRIME des
 * caractères au lieu de simplement rogner : « à venir » ou « wa.me/kosskoss »
 * n'y laissent aucun chiffre et deviennent la chaîne vide. Or le vide est une
 * valeur parfaitement légitime — le réglage est facultatif — donc le validateur
 * l'accepte. Sans ce garde-fou, une faute de saisie effaçait le numéro de
 * contact de la boutique et l'écran annonçait « Enregistré ✓ ».
 *
 * Le test porte sur la paire (saisie, valeur normalisée), jamais sur le nom du
 * champ : tout futur champ normalisant est couvert sans qu'on ait à y revenir,
 * et les champs seulement rognés ne peuvent pas le déclencher.
 *
 * Un champ volontairement vidé — saisie vide, ou seulement des espaces — reste
 * accepté : c'est la façon de retirer un réglage.
 */
export function saisieEffacee(brut: string, normalise: string): boolean {
  return brut.trim() !== "" && normalise === "";
}

/** Lit un champ texte, rogné, ou rend la chaîne vide. */
function texte(source: Record<string, unknown>, cle: string): string {
  const valeur = source[cle];
  return typeof valeur === "string" ? valeur.trim() : "";
}

/**
 * Rend un réglage complet à partir d'une entrée quelconque.
 *
 * Ne lève jamais : une colonne abîmée rend les valeurs par défaut plutôt que de
 * faire tomber toutes les pages du site, puisque le numéro WhatsApp est lu par
 * le pied de page et le bouton flottant de chacune.
 */
export function normaliserParametres(brut: unknown): ParametresBoutique {
  if (!brut || typeof brut !== "object") return { ...PARAMETRES_PAR_DEFAUT };
  const source = brut as Record<string, unknown>;

  return {
    // Le numéro est réduit à ses chiffres : la saisie humaine y met des espaces,
    // des points et un « + » que `wa.me` refuse.
    whatsapp: texte(source, "whatsapp").replace(/\D/g, ""),
    formulaireEvaluation: texte(source, "formulaireEvaluation"),
    ga4: texte(source, "ga4"),
    metaPixel: texte(source, "metaPixel"),
  };
}
