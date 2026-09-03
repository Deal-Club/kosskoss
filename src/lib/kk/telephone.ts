// src/lib/kk/telephone.ts

/**
 * Numéro de téléphone du tunnel d'achat.
 *
 * ── DEUX ÉCRITURES ACCEPTÉES ────────────────────────────────────────────────
 *
 * 1. Camerounais sans indicatif — le cas courant, la boutique livre au
 *    Cameroun. Neuf chiffres : les mobiles commencent par 6 (MTN, Orange,
 *    Camtel), les fixes par 2. L'indicatif 237 est ajouté pour nous.
 * 2. N'importe quel numéro international, à condition de porter son indicatif
 *    (`+229…`, `0033…`). Rendu tel quel en E.164.
 *
 * Le fixe camerounais est accepté volontairement : ce numéro sert le contact
 * de livraison. Le téléphone qui portera le paiement Mobile Money est saisi
 * chez le prestataire, pas ici — exiger un mobile refuserait des clients sans
 * rien garantir en échange.
 *
 * ── POURQUOI L'INDICATIF EST EXIGÉ HORS CAMEROUN ────────────────────────────
 *
 * Sans indicatif, un numéro étranger est indistinguable d'une faute de frappe
 * sur un numéro camerounais : « 6771234567 » est aussi bien un mobile local
 * avec un chiffre en trop qu'un numéro d'un autre plan de numérotation. Rendre
 * l'indicatif obligatoire dans ce cas lève l'ambiguïté sans rien refuser à
 * personne — celui qui appelle depuis l'étranger écrit déjà `+`.
 *
 * On ne valide donc PAS le plan de numérotation des autres pays : il y en a
 * deux cents, ils changent, et un client refusé à tort sur la dernière étape
 * d'un paiement est un client perdu. Seule la longueur est contrôlée, dans les
 * bornes de la norme E.164.
 */

export const INDICATIF_CM = "+237";

/** Longueur nationale camerounaise, indicatif exclu. */
const LONGUEUR = 9;

/** Premiers chiffres attribués au Cameroun : 6 pour le mobile, 2 pour le fixe. */
const PREMIERS_CHIFFRES = /^[62]/;

/**
 * Bornes E.164, indicatif compris. La norme plafonne à quinze chiffres ; le
 * plancher est fixé à neuf, ce qui écarte les saisies tronquées sans refuser
 * les plans de numérotation courts.
 */
const MIN_INTERNATIONAL = 9;
const MAX_INTERNATIONAL = 15;

/**
 * Rend le numéro camerounais en `+237XXXXXXXXX`, ou `null`.
 *
 * L'ambiguïté apparente entre un indicatif « 237 » et un fixe commençant par 2
 * se lève par la longueur : neuf chiffres est un numéro national, douze
 * commençant par 237 est un numéro international.
 */
function normaliserCameroun(chiffres: string): string | null {
  let national = chiffres;
  if (national.startsWith("00237")) national = national.slice(5);
  else if (national.length === LONGUEUR + 3 && national.startsWith("237")) {
    national = national.slice(3);
  }

  if (national.length !== LONGUEUR) return null;
  if (!PREMIERS_CHIFFRES.test(national)) return null;

  return `${INDICATIF_CM}${national}`;
}

/**
 * Rend le numéro en E.164 (`+` suivi des chiffres), ou `null` s'il n'est pas
 * exploitable.
 *
 * Le Cameroun est tenté d'abord : c'est le marché de la boutique, et c'est la
 * seule écriture qui se passe d'indicatif. À défaut, un indicatif explicite
 * (`+` ou `00`) ouvre la voie internationale.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/\D/g, "");
  if (!chiffres) return null;

  const camerounais = normaliserCameroun(chiffres);
  if (camerounais) return camerounais;

  // Hors Cameroun, l'indicatif doit être écrit — voir l'en-tête.
  const marqueInternational = saisie.trim().startsWith("+") || chiffres.startsWith("00");
  if (!marqueInternational) return null;

  const international = chiffres.startsWith("00") ? chiffres.slice(2) : chiffres;
  if (international.length < MIN_INTERNATIONAL) return null;
  if (international.length > MAX_INTERNATIONAL) return null;
  // Aucun indicatif pays ne commence par zéro : ce qui en porte un après le
  // `+` est une saisie mal recopiée, pas un numéro joignable.
  if (international.startsWith("0")) return null;

  return `+${international}`;
}
