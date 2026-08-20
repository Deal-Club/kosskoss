// src/lib/kk/telephone.ts

/**
 * Numéro de téléphone camerounais.
 *
 * Plan de numérotation : neuf chiffres. Les mobiles commencent par 6 (MTN,
 * Orange, Camtel), les fixes par 2. L'indicatif pays est 237.
 *
 * Le fixe est accepté volontairement : ce numéro sert le contact de livraison.
 * Le téléphone qui portera le paiement Mobile Money est saisi chez le
 * prestataire, pas ici — exiger un mobile refuserait des clients sans rien
 * garantir en échange.
 *
 * La validation précédente se contentait de « au moins huit chiffres ». Le
 * choix était assumé et commenté, mais le critère d'acceptation 02 demande le
 * format camerounais.
 */

export const INDICATIF_CM = "+237";

/** Longueur nationale, indicatif exclu. */
const LONGUEUR = 9;

/** Premiers chiffres attribués : 6 pour le mobile, 2 pour le fixe. */
const PREMIERS_CHIFFRES = /^[62]/;

/**
 * Rend le numéro en `+237XXXXXXXXX`, ou `null` s'il n'est pas valide.
 *
 * L'ambiguïté apparente entre un indicatif « 237 » et un fixe commençant par 2
 * se lève par la longueur : neuf chiffres est un numéro national, douze
 * commençant par 237 est un numéro international.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/\D/g, "");
  if (!chiffres) return null;

  let national = chiffres;
  if (national.startsWith("00237")) national = national.slice(5);
  else if (national.length === LONGUEUR + 3 && national.startsWith("237")) {
    national = national.slice(3);
  }

  if (national.length !== LONGUEUR) return null;
  if (!PREMIERS_CHIFFRES.test(national)) return null;

  return `${INDICATIF_CM}${national}`;
}
