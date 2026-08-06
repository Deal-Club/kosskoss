// Utilitaires de prix — module pur, sans dépendance à la base.
// Devise KossKoss : Franc CFA (XAF), SANS sous-unité. Le champ historique
// `priceCents` porte donc un ENTIER de FCFA (jamais divisé/multiplié par 100).

/**
 * Convertit une saisie de prix ("18 500", "18.500 FCFA") en entier FCFA.
 * Retourne 0 si la valeur est manquante ou non numérique.
 */
export function toCents(value: string): number {
  const normalized = value.replace(/[.\s]/g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

/**
 * Formate un entier FCFA en chaîne lisible ("18 500 FCFA").
 */
export function formatPrice(cents: number): string {
  return `${Math.round(cents).toLocaleString("fr-FR")} FCFA`;
}
