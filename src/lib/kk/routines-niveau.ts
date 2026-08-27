// Niveau d'une routine — module pur, sans accès base de données.
//
// Le master client (KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx, onglet ROUTINES,
// colonne Niveau) porte deux niveaux par besoin : « Eco » et « Premium ».
// `Routine.niveau` n'est PAS un enum Prisma — le schéma s'en interdit
// délibérément, pour rester portable d'un moteur SQL à l'autre (voir l'en-tête
// de prisma/schema.prisma) — c'est donc ce module qui porte la liste fermée
// des valeurs valides et leur libellé d'affichage.

/** Les deux niveaux du master, dans l'ordre où ils s'affichent. */
export const NIVEAUX = ["eco", "premium"] as const;

export type NiveauRoutine = (typeof NIVEAUX)[number];

/** Vrai si `valeur` est l'un des niveaux reconnus. */
export function estNiveau(valeur: string): valeur is NiveauRoutine {
  return (NIVEAUX as readonly string[]).includes(valeur);
}

/**
 * Libellé affiché pour chaque niveau. Le nom « Eco » du master n'est pas
 * repris tel quel à l'écran : la marque appelle ce niveau « Essentielle »
 * (voir docs/13-cdc-synthesis-and-gap.md et le vocabulaire des écrans de
 * routine), pour ne pas laisser entendre une gamme au rabais. Un écran ne
 * doit jamais écrire ces libellés en dur — il lit cette table.
 */
export const LIBELLES_NIVEAUX: Record<NiveauRoutine, string> = {
  eco: "Essentielle",
  premium: "Premium",
};

/** Libellés anglais des mêmes niveaux, pour /en. */
const LIBELLES_NIVEAUX_EN: Record<NiveauRoutine, string> = {
  eco: "Essential",
  premium: "Premium",
};

/** Libellé d'un niveau, avec un repli lisible pour une valeur inconnue en base. */
export function libelleNiveau(valeur: string, locale: "fr" | "en" = "fr"): string {
  if (!estNiveau(valeur)) return valeur;
  return locale === "en" ? LIBELLES_NIVEAUX_EN[valeur] : LIBELLES_NIVEAUX[valeur];
}
