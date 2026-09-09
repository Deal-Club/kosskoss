import type { Locale } from "@/i18n/routing";

/**
 * Étiquettes valorisantes du profil beauté (TK-02).
 *
 * L'écran de résultat reprenait les RÉPONSES BRUTES du QCM comme étiquettes de
 * profil : « Briller sur l'ensemble du visage », « Non ». Une réponse est une
 * phrase de question, pas un attribut de personne — « Non » ne dit rien à qui
 * n'a plus la question sous les yeux.
 *
 * Cette table transforme la CLÉ de réponse (DiagAnswer.key, stable et
 * indépendante de la langue — voir scripts/installer-quiz-diagnostic.ts) en
 * étiquette de profil : « Peau Grasse », « Peau Tolérante », « Climat Chaud &
 * Humide ». Module pur, comme diagnostic-matrice.ts : aucune connaissance de
 * la base, seulement des clés.
 *
 * Une clé inconnue rend `null` : l'appelant retombe alors sur le libellé brut
 * plutôt que d'afficher une étiquette vide — une réponse ajoutée en base sans
 * entrée ici reste visible, c'est le signe qu'il faut compléter la table.
 */

type Etiquette = { fr: string; en: string };

/** Q1 « peau » + Q3 « reactivite » + Q4 « environnement », par clé de réponse.
 *  Q2 (« priorite ») n'y figure pas : ses libellés (« Glow / Éclat »…) sont
 *  déjà des étiquettes, pas des phrases. */
const ETIQUETTES: Record<string, Etiquette> = {
  // Q1 — type de peau.
  peau_grasse: { fr: "Peau Grasse", en: "Oily Skin" },
  peau_mixte: { fr: "Peau Mixte", en: "Combination Skin" },
  peau_seche: { fr: "Peau Sèche", en: "Dry Skin" },
  peau_normale: { fr: "Peau Normale", en: "Balanced Skin" },
  // Q3 — réactivité. « Oui »/« Non » deviennent un attribut, pas un aveu.
  reactive: { fr: "Peau Sensible", en: "Sensitive Skin" },
  tolerante: { fr: "Peau Tolérante", en: "Resilient Skin" },
  // Q4 — environnement quotidien.
  chaleur_humidite: { fr: "Climat Chaud & Humide", en: "Hot & Humid Climate" },
  climatisation: { fr: "Espaces Climatisés", en: "Air-Conditioned Spaces" },
  mixte: { fr: "Climat Mixte", en: "Mixed Climate" },
};

export function etiquetteProfil(answerKey: string | undefined, locale: Locale): string | null {
  if (!answerKey) return null;
  const e = ETIQUETTES[answerKey];
  if (!e) return null;
  return locale === "en" ? e.en : e.fr;
}
