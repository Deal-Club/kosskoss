/**
 * Choix de la langue d'un e-mail transactionnel.
 *
 * Le motif vient de `src/server/emails/order.ts`, qui résout déjà ce problème
 * pour l'e-mail de commande hérité. On l'extrait en fonction nommée parce que
 * quatre e-mails vont s'en servir, plutôt que d'en écrire une seconde variante.
 *
 * Le français est le repli : c'est la langue de référence du site, celle qui
 * engage la société.
 */

export type Langue = "fr" | "en";

export function choisirLangue(locale: string | null | undefined): Langue {
  return locale?.toLowerCase() === "en" ? "en" : "fr";
}
