import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, PackageOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AccountShell } from "@/components/account/AccountShell";
import { requireCustomer } from "@/server/customerSession";
import { listCustomerOrders } from "@/server/customers";
import { formatPrice } from "@/server/store";
import {
  ORDER_STATUS_BADGES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orderStatus";

type PageParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("orders.metaTitle"), robots: { index: false, follow: false } };
}

export default async function AccountOrdersPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const customer = await requireCustomer(locale, "/compte/commandes");
  const t = await getTranslations({ locale, namespace: "account" });

  const orders = await listCustomerOrders(customer.id);
  const language = locale === "en" ? "en" : "fr";
  const dateFormatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "medium",
  });

  return (
    <AccountShell
      locale={locale}
      active="orders"
      title={t("orders.title")}
      intro={t("orders.intro")}
    >
      {orders.length === 0 ? (
        <div className="rounded-sm border border-border bg-white px-6 py-14 text-center">
          <PackageOpen className="mx-auto mb-4 h-10 w-10 text-border" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            {t("common.shopCta")}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t("orders.title")}</caption>
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {t("orders.number")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t("orders.date")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t("orders.items")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t("orders.status")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t("orders.payment")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t("orders.total")}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  <span className="sr-only">{t("orders.view")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderNumber} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/compte/commandes/${order.orderNumber}`}
                      className="font-black text-foreground hover:text-primary"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {dateFormatter.format(new Date(order.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{order.itemCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-1 text-xs font-bold ${ORDER_STATUS_BADGES[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status][language]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-1 text-xs font-bold ${PAYMENT_STATUS_BADGES[order.paymentStatus]}`}
                    >
                      {PAYMENT_STATUS_LABELS[order.paymentStatus][language]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black whitespace-nowrap text-foreground">
                    {formatPrice(order.totalCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/compte/commandes/${order.orderNumber}`}
                      aria-label={`${t("orders.view")} ${order.orderNumber}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      <Eye className="h-4 w-4" aria-hidden />
                      {t("orders.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Les commandes passées en tant qu'invité ne sont pas rattachables après
          coup : rien ne prouverait que l'adresse e-mail appartient au compte. */}
      <p className="rounded-sm border border-border bg-white px-4 py-3 text-xs text-muted-foreground">
        {t("orders.guestHint")}
      </p>
    </AccountShell>
  );
}
