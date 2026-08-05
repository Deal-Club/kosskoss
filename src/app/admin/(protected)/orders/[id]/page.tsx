import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { getOrder, type OrderAddress } from "@/server/orders";
import {
  ORDER_STATUS_BADGES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orderStatus";
import { formatPrice } from "@/server/store";
import { OrderStatusPanel } from "@/components/admin/OrderStatusPanel";
import { DeleteButton } from "@/components/admin/DeleteButton";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Toutes les commandes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateFormatter.format(new Date(order.createdAt))} · {order.locale.toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-sm px-3 py-1.5 text-xs font-bold ${ORDER_STATUS_BADGES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status].fr}
          </span>
          <span
            className={`rounded-sm px-3 py-1.5 text-xs font-bold ${PAYMENT_STATUS_BADGES[order.paymentStatus]}`}
          >
            {PAYMENT_STATUS_LABELS[order.paymentStatus].fr}
          </span>
          {/* Lien vers la page vue par le client, jeton inclus */}
          <Link
            href={`/confirmation/${order.orderNumber}?token=${order.accessToken}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Vue client
          </Link>
          <DeleteButton
            action={`/api/admin/orders/${order.id}`}
            confirmLabel={`Supprimer définitivement la commande ${order.orderNumber} ?`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Articles et montants, tels qu'archivés à la commande */}
          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-4 text-lg font-black text-foreground">Lignes de commande</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2 pr-3">Article</th>
                    <th className="py-2 pr-3">Réf.</th>
                    <th className="py-2 pr-3 text-right">Prix unitaire</th>
                    <th className="py-2 pr-3 text-right">Quantité</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-3">
                        <span className="block text-xs text-muted-foreground">{item.brand}</span>
                        {item.productId ? (
                          <Link
                            href={`/admin/products/${item.productId}`}
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-foreground">
                            {item.name}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (produit supprimé)
                            </span>
                          </span>
                        )}
                        {item.variantLabel && (
                          <span className="block text-xs text-muted-foreground">
                            {item.variantLabel}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{item.sku || "—"}</td>
                      <td className="py-3 pr-3 text-right text-muted-foreground">
                        {formatPrice(item.unitPriceCents)}
                      </td>
                      <td className="py-3 pr-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="py-3 text-right font-semibold text-foreground">
                        {formatPrice(item.lineTotalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 ml-auto max-w-xs space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sous-total</dt>
                <dd className="font-semibold text-foreground">{formatPrice(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Frais de livraison
                  {/* Le mode retenu, pour ne pas avoir à deviner d'où viennent
                      60 € de port sur une commande. */}
                  <span className="mt-0.5 block text-xs">
                    {order.shippingMethodKey === "express"
                      ? "Express — 24 à 48 h"
                      : "Standard — 3 à 5 jours"}
                  </span>
                </dt>
                <dd className="font-semibold text-foreground">
                  {order.shippingCents === 0 ? "offerts" : formatPrice(order.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-black text-foreground">Total</dt>
                <dd className="font-black text-primary">{formatPrice(order.totalCents)}</dd>
              </div>
            </dl>
          </section>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-3 text-sm font-black text-foreground">Adresse de facturation</h2>
              <AddressBlock address={order.billing} />
            </section>
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-3 text-sm font-black text-foreground">
                Adresse de livraison
                {order.shippingSameAsBilling && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (identique à la facturation)
                  </span>
                )}
              </h2>
              <AddressBlock address={order.shippingSameAsBilling ? order.billing : order.shipping} />
            </section>
          </div>

          {order.customerNote && (
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-2 text-sm font-black text-foreground">Remarque du client</h2>
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {order.customerNote}
              </p>
            </section>
          )}

          {/* Journal : chaque changement de statut y laisse une trace horodatée */}
          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">Historique</h2>
            <ul className="space-y-3">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>
                    <span className="block font-semibold text-foreground">
                      {event.kind === "payment"
                        ? "Statut de paiement"
                        : event.kind === "note"
                          ? "Note"
                          : event.kind === "email"
                            ? "E-mail"
                            : "Statut de commande"}
                      {event.toValue && ` : ${event.toValue}`}
                      {event.fromValue && ` (avant : ${event.fromValue})`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(event.createdAt))}
                      {event.createdBy ? ` · ${event.createdBy}` : ""}
                    </span>
                    {event.note && (
                      <span className="mt-1 block text-xs text-muted-foreground">{event.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <OrderStatusPanel
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            adminNote={order.adminNote}
          />

          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">Client</h2>
            <p className="text-sm text-muted-foreground">
              <a href={`mailto:${order.email}`} className="hover:text-primary hover:underline">
                {order.email}
              </a>
            </p>
            {order.phone && <p className="text-sm text-muted-foreground">{order.phone}</p>}
          </section>

          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">Paiement</h2>
            <p className="text-sm font-semibold text-foreground">{order.paymentMethodLabel}</p>
            <p className="text-xs text-muted-foreground">
              Clé : {order.paymentMethodKey}
              {order.paymentMethodFee ? ` · ${order.paymentMethodFee}` : ""}
            </p>
            {order.paidAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Payée le {dateFormatter.format(new Date(order.paidAt))}
              </p>
            )}
            {order.shippedAt && (
              <p className="text-xs text-muted-foreground">
                Expédiée le {dateFormatter.format(new Date(order.shippedAt))}
              </p>
            )}
          </section>

          {/* Preuve des consentements exigés par § 312j BGB */}
          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">Consentements</h2>
            <p className="text-xs text-muted-foreground">
              CGV acceptées :{" "}
              {order.termsAcceptedAt ? dateFormatter.format(new Date(order.termsAcceptedAt)) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Droit de rétractation confirmé :{" "}
              {order.withdrawalAcknowledgedAt
                ? dateFormatter.format(new Date(order.withdrawalAcknowledgedAt))
                : "—"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function AddressBlock({ address }: { address: OrderAddress }) {
  return (
    <div className="space-y-0.5 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">
        {address.salutation && `${address.salutation} `}
        {address.firstName} {address.lastName}
      </p>
      {address.company && <p>{address.company}</p>}
      <p>{address.street}</p>
      <p>
        {address.postalCode} {address.city}
      </p>
      <p>{address.country}</p>
    </div>
  );
}
