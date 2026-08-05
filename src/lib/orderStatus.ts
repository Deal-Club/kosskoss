// Statuts de commande et de paiement.
//
// Ce module ne dépend ni de Prisma ni du serveur : les composants du
// back-office peuvent l'importer sans embarquer la couche base de données
// dans le bundle du navigateur. src/server/orders.ts le réexporte.
//
// Les valeurs sont stockées en texte (pas d'enum Prisma) pour que le schéma
// reste identique sous SQLite et sous PostgreSQL.

export const ORDER_STATUSES = [
  "eingegangen",
  "in_bearbeitung",
  "versandt",
  "zugestellt",
  "storniert",
] as const;

export const PAYMENT_STATUSES = ["offen", "bezahlt", "erstattet", "fehlgeschlagen"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// `de` et `en` alimentent la boutique publique, `fr` le back-office.
export const ORDER_STATUS_LABELS: Record<OrderStatus, { de: string; en: string; fr: string }> = {
  eingegangen: { de: "Eingegangen", en: "Received", fr: "Reçue" },
  in_bearbeitung: { de: "In Bearbeitung", en: "In progress", fr: "En traitement" },
  versandt: { de: "Versandt", en: "Shipped", fr: "Expédiée" },
  zugestellt: { de: "Zugestellt", en: "Delivered", fr: "Livrée" },
  storniert: { de: "Storniert", en: "Cancelled", fr: "Annulée" },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { de: string; en: string; fr: string }> = {
  offen: { de: "Offen", en: "Open", fr: "En attente" },
  bezahlt: { de: "Bezahlt", en: "Paid", fr: "Payée" },
  erstattet: { de: "Erstattet", en: "Refunded", fr: "Remboursée" },
  fehlgeschlagen: { de: "Fehlgeschlagen", en: "Failed", fr: "Échouée" },
};

/** Pastilles du back-office, dans le même esprit que celles des avis clients. */
export const ORDER_STATUS_BADGES: Record<OrderStatus, string> = {
  eingegangen: "bg-accent text-accent-foreground",
  in_bearbeitung: "bg-secondary text-secondary-foreground",
  versandt: "bg-[#16a34a] text-white",
  zugestellt: "bg-muted text-muted-foreground",
  storniert: "bg-destructive text-white",
};

export const PAYMENT_STATUS_BADGES: Record<PaymentStatus, string> = {
  offen: "bg-accent text-accent-foreground",
  bezahlt: "bg-[#16a34a] text-white",
  erstattet: "bg-muted text-muted-foreground",
  fehlgeschlagen: "bg-destructive text-white",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}
