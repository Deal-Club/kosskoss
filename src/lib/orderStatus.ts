// Statuts de commande et de paiement.
//
// Ce module ne dépend ni de Prisma ni du serveur : les composants du
// back-office peuvent l'importer sans embarquer la couche base de données
// dans le bundle du navigateur. src/server/orders.ts le réexporte.
//
// Les valeurs sont stockées en texte (pas d'enum Prisma) pour que le schéma
// reste identique sous SQLite et sous PostgreSQL.

export const ORDER_STATUSES = [
  "recue",
  "en_traitement",
  "expediee",
  "livree",
  "annulee",
] as const;

export const PAYMENT_STATUSES = ["en_attente", "payee", "remboursee", "echouee"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// `fr` alimente la boutique française et tout le back-office, `en` la version
// anglaise (/en). La langue est choisie d'après la locale de la page.
export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; fr: string }> = {
  recue: { en: "Received", fr: "Reçue" },
  en_traitement: { en: "In progress", fr: "En traitement" },
  expediee: { en: "Shipped", fr: "Expédiée" },
  livree: { en: "Delivered", fr: "Livrée" },
  annulee: { en: "Cancelled", fr: "Annulée" },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; fr: string }> = {
  en_attente: { en: "Pending", fr: "En attente" },
  payee: { en: "Paid", fr: "Payée" },
  remboursee: { en: "Refunded", fr: "Remboursée" },
  echouee: { en: "Failed", fr: "Échouée" },
};

/** Pastilles du back-office, dans le même esprit que celles des avis clients. */
export const ORDER_STATUS_BADGES: Record<OrderStatus, string> = {
  recue: "bg-accent text-accent-foreground",
  en_traitement: "bg-secondary text-secondary-foreground",
  expediee: "bg-[#16a34a] text-white",
  livree: "bg-muted text-muted-foreground",
  annulee: "bg-destructive text-white",
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
