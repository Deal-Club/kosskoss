import { prisma } from "@/server/prisma";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/lib/orderStatus";
import type { Locale } from "@/i18n/routing";

// Les libellés viennent de src/lib/orderStatus.ts — la table bilingue que le
// back-office et /compte/commandes utilisent déjà. Ce module portait sa propre
// copie française, qui s'affichait donc telle quelle sur /en/compte.
export function orderStatusLabel(status: string, locale: Locale): string {
  if (!isOrderStatus(status)) return status;
  return ORDER_STATUS_LABELS[status][locale === "en" ? "en" : "fr"];
}

export type AccountOrderRow = {
  orderNumber: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  totalFcfa: number;
  itemCount: number;
};

export async function getAccountOrders(customerId: string, locale: Locale): Promise<AccountOrderRow[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    statusLabel: orderStatusLabel(o.status, locale),
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
  locale: Locale,
): Promise<AccountOrderDetail | null> {
  const o = await prisma.order.findFirst({
    where: { customerId, orderNumber },
    include: { items: true },
  });
  if (!o) return null;
  return {
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    statusLabel: orderStatusLabel(o.status, locale),
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
