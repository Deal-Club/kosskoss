import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AccountShell } from "@/components/account/AccountShell";
import { requireCustomer } from "@/server/customerSession";
import { getCustomerOrder } from "@/server/customers";
import { formatPrice } from "@/server/store";
import type { OrderAddress } from "@/server/orders";
import {
  ORDER_STATUS_BADGES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orderStatus";

type PageParams = Promise<{ locale: string; orderNumber: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, orderNumber } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return {
    title: t("orders.detailMetaTitle", { orderNumber: decodeURIComponent(orderNumber) }),
    robots: { index: false, follow: false },
  };
}

/**
 * Détail d'une commande du compte.
 *
 * Même présentation que la page de confirmation, mais l'accès ne repose pas sur
 * le jeton envoyé par e-mail : `getCustomerOrder` ne rend la commande que si
 * elle porte bien l'identifiant du compte connecté.
 */
export default async function AccountOrderDetailPage({ params }: { params: PageParams }) {
  const { locale, orderNumber } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const decoded = decodeURIComponent(orderNumber);
  const customer = await requireCustomer(locale, `/compte/commandes/${decoded}`);

  const [t, checkout, order] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "checkout" }),
    getCustomerOrder(customer.id, decoded),
  ]);

  // Une commande qui n'appartient pas au compte est traitée comme inexistante :
  // rien n'indique si le numéro est valide ailleurs.
  if (!order) notFound();

  const language = locale === "en" ? "en" : "fr";
  const orderDate = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(order.createdAt));

  return (
    <AccountShell locale={locale} active="orders" title={order.orderNumber}>
      <p>
        <Link
          href="/compte/commandes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("orders.backToList")}
        </Link>
      </p>

      <section className="rounded-sm border border-border bg-white p-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {checkout("confirmation.orderNumber")}
            </dt>
            <dd className="text-lg font-black text-primary">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {checkout("confirmation.orderDate")}
            </dt>
            <dd className="text-sm font-semibold text-foreground">{orderDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {checkout("confirmation.statusOrder")}
            </dt>
            <dd className="mt-0.5">
              <span
                className={`inline-block rounded-sm px-2 py-1 text-xs font-bold ${ORDER_STATUS_BADGES[order.status]}`}
              >
                {ORDER_STATUS_LABELS[order.status][language]}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-sm border border-border bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-black text-foreground">
              {checkout("confirmation.itemsTitle")}
            </h2>

            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start gap-4 py-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={`${item.brand} ${item.name}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {item.brand}
                    </span>
                    {item.path ? (
                      <Link
                        href={item.path}
                        className="block text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="block text-sm font-semibold text-foreground">
                        {item.name}
                      </span>
                    )}
                    {item.variantLabel && (
                      <span className="block text-xs text-muted-foreground">
                        {item.variantLabel}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {checkout("quantityShort", { count: item.quantity })}{" "}
                      {formatPrice(item.unitPriceCents)}
                      {item.sku ? ` · ${item.sku}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-black text-foreground">
                    {formatPrice(item.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{checkout("subtotal")}</dt>
                <dd className="font-semibold text-foreground">
                  {formatPrice(order.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{checkout("shipping")}</dt>
                <dd className="font-semibold text-foreground">
                  {order.shippingCents === 0
                    ? checkout("shippingFree")
                    : formatPrice(order.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-black text-foreground">{checkout("total")}</dt>
                <dd className="font-black text-primary">{formatPrice(order.totalCents)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">
              {checkout("confirmation.contactTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{order.email}</p>
            {order.phone && <p className="text-sm text-muted-foreground">{order.phone}</p>}
          </section>

          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">
              {checkout("confirmation.addressTitle")}
            </h2>
            <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {checkout("reviewBilling")}
            </h3>
            <AddressBlock address={order.billing} />
            <h3 className="mt-4 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {checkout("reviewShipping")}
            </h3>
            <AddressBlock
              address={order.shippingSameAsBilling ? order.billing : order.shipping}
            />
          </section>

          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-3 text-sm font-black text-foreground">
              {checkout("confirmation.paymentTitle")}
            </h2>
            <p className="text-sm font-semibold text-foreground">{order.paymentMethodLabel}</p>
            {order.paymentMethodFee && (
              <p className="text-xs text-muted-foreground">{order.paymentMethodFee}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {checkout("confirmation.statusPayment")}:{" "}
              <span
                className={`ml-1 inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS_BADGES[order.paymentStatus]}`}
              >
                {PAYMENT_STATUS_LABELS[order.paymentStatus][language]}
              </span>
            </p>
          </section>

          {/* Information post-contractuelle sur le droit de rétractation
              (§ 312f BGB), comme sur la page de confirmation. */}
          <section className="rounded-sm border border-border bg-white p-5">
            <h2 className="mb-2 text-sm font-black text-foreground">
              {checkout("confirmation.withdrawalTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {checkout("confirmation.withdrawalText")}
            </p>
            <Link
              href="/retractation"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              {checkout("confirmation.withdrawalLink")}
            </Link>
          </section>
        </aside>
      </div>
    </AccountShell>
  );
}

function AddressBlock({ address }: { address: OrderAddress }) {
  return (
    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">
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
