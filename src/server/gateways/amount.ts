/**
 * Conversion des montants annoncés par les prestataires vers les centimes
 * utilisés en base.
 *
 * Deux conventions coexistent chez les prestataires : Stripe et Square comptent
 * en plus petite unité monétaire (centimes), PayPal et Mollie en unité
 * principale sous forme de chaîne décimale (« 214.50 »). Les seconds passent
 * par ici avant d'être comparés au total de la commande.
 */

/**
 * Convertit une chaîne décimale (« 214.50 ») en centimes (21450).
 *
 * Le découpage se fait sur le texte plutôt que par `Math.round(Number(v) * 100)` :
 * sur une valeur comme « 214.35 », la multiplication flottante donne
 * 21434.999999999996, et l'arrondi dépend alors du hasard des décimales. En
 * séparant partie entière et décimales, le résultat est exact quel que soit le
 * montant.
 *
 * Rend `null` si la valeur est absente ou illisible — le contrôle de montant est
 * alors sauté plutôt que de rejeter un paiement légitime sur un format
 * inattendu.
 */
export function decimalToCents(value: string | undefined | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(-?)(\d+)(?:[.,](\d{1,2}))?$/);
  if (!m) return null;
  const [, signe, entiers, decimales = ""] = m;
  const centimes = Number(entiers) * 100 + Number(decimales.padEnd(2, "0"));
  return signe === "-" ? -centimes : centimes;
}
