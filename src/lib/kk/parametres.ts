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
 * l'en-tête et le pied de page de chacune.
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
