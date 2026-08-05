import type { CartLine } from "@/lib/cart";

// Montants en FCFA ENTIERS : `priceCents` porte le prix FCFA, jamais divisé.
export function cartSubtotalFcfa(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}

export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
