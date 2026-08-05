// Utilitaires de conversion de prix — module pur, sans dépendance à la base.
// Importable dans les parseurs de saisie et les tests sans déclencher Prisma.

/**
 * Convertit une chaîne de prix française ("349,00 €") en centimes.
 * Retourne 0 si la valeur est manquante ou non numérique.
 */
export function toCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/**
 * Formate des centimes en chaîne de prix française ("349,00 €").
 */
export function formatPrice(cents: number): string {
  return `${(cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
