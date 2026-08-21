/**
 * Validation d'adresse e-mail commune aux points d'entrée publics.
 *
 * Deux routes acceptent une adresse fournie par un visiteur : l'inscription à
 * la lettre d'information (`src/app/api/kk/newsletter/route.ts`) et l'envoi de
 * la routine du diagnostic (`src/app/api/kk/diagnostic/routine-email/route.ts`).
 * Une règle de validation qui vivrait dans les deux fichiers finirait par
 * diverger sans que rien ne le signale — elle est donc écrite une seule fois
 * ici, et les deux routes l'importent.
 *
 * Volontairement large : le rôle du serveur est d'écarter les saisies
 * manifestement fausses, pas de refuser des adresses valides mais
 * inhabituelles. La confirmation par e-mail tranchera le reste.
 */

const FORME_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Longueur maximale acceptée pour la partie locale et le domaine réunis. */
export const LONGUEUR_MAX_EMAIL = 254;

/**
 * `adresse` est attendue déjà nettoyée (`trim().toLowerCase()`) par
 * l'appelant : cette fonction ne fait que juger la forme et la longueur.
 */
export function adresseEmailValide(adresse: string): boolean {
  return FORME_EMAIL.test(adresse) && adresse.length <= LONGUEUR_MAX_EMAIL;
}
