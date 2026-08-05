/**
 * Formatage monétaire KossKoss Select.
 *
 * Devise : Franc CFA (XAF) — SANS sous-unité. Les montants sont des entiers de
 * FCFA (pas de centimes) : on ne divise jamais par 100. Séparateur de milliers
 * par espace insécable fine, suffixe « FCFA ».
 *
 * Exemple : formatFcfa(15000) -> "15 000 FCFA"
 */
export function formatFcfa(amount: number): string {
  const grouped = new Intl.NumberFormat("fr-FR").format(Math.round(amount));
  // Remplace l'espace de groupement par une espace insécable fine.
  return `${grouped.replace(/\s/g, " ")} FCFA`;
}
