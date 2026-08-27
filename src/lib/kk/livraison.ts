/**
 * Frais de livraison — module pur, sans accès base de données.
 *
 * VALEURS PAR DÉFAUT, POSÉES EN DUR POUR LE MOMENT — à la demande du client,
 * en attendant qu'elles deviennent administrables depuis le back-office
 * (comme les moyens de paiement, voir `src/server/kk/payments.ts`). Douala et
 * Yaoundé sont desservies en direct (24 à 72 h, voir les pages légales
 * livraison) ; les autres villes passent par un transporteur, d'où un tarif
 * plus élevé.
 *
 * Le montant EST facturé : `createKossOrder` (src/server/kk/checkout.ts)
 * l'ajoute à `totalCents`, qui est le montant réellement transmis à la
 * passerelle de paiement (voir `src/server/kk/paiement.ts`) — ce n'est donc
 * pas un affichage indicatif. Recalculé ICI SEULEMENT, jamais reçu du
 * navigateur tel quel — même règle que le prix des produits.
 */

export const VILLES_LIVRAISON = ["douala", "yaounde", "autre"] as const;
export type VilleLivraison = (typeof VILLES_LIVRAISON)[number];

const FRAIS_PAR_VILLE: Record<VilleLivraison, number> = {
  douala: 2000,
  yaounde: 2000,
  // Tarif transporteur, faute de connaître la destination précise : c'est un
  // plancher, pas une estimation fine — la livraison reste ensuite coordonnée
  // (et ajustée si besoin) par WhatsApp.
  autre: 3500,
};

export function estVilleLivraison(value: string): value is VilleLivraison {
  return (VILLES_LIVRAISON as readonly string[]).includes(value);
}

/** Retombe sur le tarif « autre » pour une clé absente ou invalide. */
export function fraisLivraisonFcfa(ville: string): number {
  return FRAIS_PAR_VILLE[estVilleLivraison(ville) ? ville : "autre"];
}
