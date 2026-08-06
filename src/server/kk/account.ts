import { prisma } from "@/server/prisma";

const STATUS_LABELS: Record<string, string> = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  en_acheminement: "En acheminement",
  livree: "Livrée",
  evaluee: "Évaluée",
  annulee: "Annulée / Remboursée",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export type AccountOrderRow = {
  orderNumber: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  totalFcfa: number;
  itemCount: number;
};

export async function getAccountOrders(customerId: string): Promise<AccountOrderRow[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    statusLabel: orderStatusLabel(o.status),
    totalFcfa: o.totalCents,
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
  }));
}

export type AccountOrderDetail = {
  orderNumber: string;
  createdAt: string;
  statusLabel: string;
  totalFcfa: number;
  location: string;
  phone: string;
  paymentLabel: string;
  items: { id: string; brand: string; name: string; variantLabel: string; quantity: number; lineTotalFcfa: number }[];
};

export async function getAccountOrder(
  customerId: string,
  orderNumber: string,
): Promise<AccountOrderDetail | null> {
  const o = await prisma.order.findFirst({
    where: { customerId, orderNumber },
    include: { items: true },
  });
  if (!o) return null;
  return {
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    statusLabel: orderStatusLabel(o.status),
    totalFcfa: o.totalCents,
    location: o.billingStreet,
    phone: o.phone,
    paymentLabel: o.paymentMethodLabel,
    items: o.items.map((i) => ({
      id: i.id,
      brand: i.brand,
      name: i.name,
      variantLabel: i.variantLabel,
      quantity: i.quantity,
      lineTotalFcfa: i.lineTotalCents,
    })),
  };
}
