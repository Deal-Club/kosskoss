// Statuts de commande et de paiement.
//
// Ce module ne dépend ni de Prisma ni du serveur : les composants du
// back-office peuvent l'importer sans embarquer la couche base de données
// dans le bundle du navigateur. src/server/orders.ts le réexporte.
//
// Les valeurs sont stockées en texte (pas d'enum Prisma) pour que le schéma
// reste identique sous SQLite et sous PostgreSQL.
//
// ── LES STATUTS SONT CEUX DU CAHIER DES CHARGES ─────────────────────────────
//
// La liste précédente était celle héritée de `mlcbois` — reçue, en traitement,
// expédiée, livrée, annulée. Elle ne correspondait pas au CDC KossKoss (voir
// docs/13, §3), et surtout `src/server/kk/checkout.ts` créait déjà les
// commandes avec `en_attente_paiement`, une valeur ABSENTE de la liste : le
// libellé et la pastille du back-office ne trouvaient donc rien à afficher pour
// toute commande fraîchement passée.
//
// Deux ajouts par rapport au CDC :
//   — « remboursee » est un statut à part entière et non un synonyme
//     d'« annulée ». Le CDC les écrit « Annulée/Remboursée », mais une commande
//     remboursée a été payée puis rendue, alors qu'une commande annulée n'a
//     jamais encaissé. Confondre les deux fausse le chiffre d'affaires.
//   — l'ordre du tableau est l'ordre du parcours : le back-office s'en sert
//     pour proposer l'étape suivante.

export const ORDER_STATUSES = [
  "en_attente_paiement",
  "payee",
  "en_preparation",
  "en_acheminement",
  "livree",
  "evaluee",
  "annulee",
  "remboursee",
] as const;

export const PAYMENT_STATUSES = ["en_attente", "payee", "remboursee", "echouee"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Statut d'une commande qui vient d'être passée.
 *
 * Nommé plutôt qu'écrit en dur au fil du code : c'est la valeur que le tunnel
 * de commande, les tests et le semis doivent partager. Elle a déjà divergé une
 * fois de la liste ci-dessus.
 */
export const ORDER_STATUS_INITIAL: OrderStatus = "en_attente_paiement";

// `fr` alimente la boutique française et tout le back-office, `en` la version
// anglaise (/en). La langue est choisie d'après la locale de la page.
export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; fr: string }> = {
  en_attente_paiement: { en: "Awaiting payment", fr: "En attente de paiement" },
  payee: { en: "Paid", fr: "Payée" },
  en_preparation: { en: "Being prepared", fr: "En préparation" },
  en_acheminement: { en: "On its way", fr: "En acheminement" },
  livree: { en: "Delivered", fr: "Livrée" },
  evaluee: { en: "Reviewed", fr: "Évaluée" },
  annulee: { en: "Cancelled", fr: "Annulée" },
  remboursee: { en: "Refunded", fr: "Remboursée" },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; fr: string }> = {
  en_attente: { en: "Pending", fr: "En attente" },
  payee: { en: "Paid", fr: "Payée" },
  remboursee: { en: "Refunded", fr: "Remboursée" },
  echouee: { en: "Failed", fr: "Échouée" },
};

/** Pastilles du back-office, dans le même esprit que celles des avis clients. */
export const ORDER_STATUS_BADGES: Record<OrderStatus, string> = {
  en_attente_paiement: "bg-accent text-accent-foreground",
  payee: "bg-[#16a34a] text-white",
  en_preparation: "bg-secondary text-secondary-foreground",
  en_acheminement: "bg-secondary text-secondary-foreground",
  livree: "bg-muted text-muted-foreground",
  evaluee: "bg-muted text-muted-foreground",
  annulee: "bg-destructive text-white",
  remboursee: "bg-destructive text-white",
};

export const PAYMENT_STATUS_BADGES: Record<PaymentStatus, string> = {
  en_attente: "bg-accent text-accent-foreground",
  payee: "bg-[#16a34a] text-white",
  remboursee: "bg-muted text-muted-foreground",
  echouee: "bg-destructive text-white",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}
