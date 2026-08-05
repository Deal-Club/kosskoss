import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, MapPin, Receipt, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AccountShell } from "@/components/account/AccountShell";
import { requireCustomer } from "@/server/customerSession";
import { listCustomerOrders } from "@/server/customers";
import { formatPrice } from "@/server/store";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orderStatus";

type PageParams = Promise<{ locale: string }>;

// La page dépend du cookie de session : jamais de rendu statique, jamais de cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return {
    title: t("metaTitle"),
    // Un espace client n'a rien à faire dans un index de moteur de recherche.
    robots: { index: false, follow: false },
  };
}

export default async function AccountDashboardPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const customer = await requireCustomer(locale, "/compte");
  const t = await getTranslations({ locale, namespace: "account" });

  const orders = await listCustomerOrders(customer.id, 3);
  const language = locale === "en" ? "en" : "fr";
  const dateFormatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "long",
  });

  const tiles = [
    {
      href: "/compte/commandes",
      icon: Receipt,
      title: t("dashboard.tiles.ordersTitle"),
      text: t("dashboard.tiles.ordersText"),
    },
    {
      href: "/compte/adresses",
      icon: MapPin,
      title: t("dashboard.tiles.addressesTitle"),
      text: t("dashboard.tiles.addressesText"),
    },
    {
      href: "/compte/informations",
      icon: ShieldCheck,
      title: t("dashboard.tiles.dataTitle"),
      text: t("dashboard.tiles.dataText"),
    },
  ];

  return (
    <AccountShell
      locale={locale}
      active="dashboard"
      title={t("dashboard.greeting", { name: `${customer.firstName} ${customer.lastName}`.trim() })}
      intro={t("dashboard.intro")}
    >
      <p className="text-sm text-muted-foreground">
        {t("dashboard.memberSince", { date: dateFormatter.format(new Date(customer.createdAt)) })}
      </p>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-sm border border-border bg-white p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon className="mb-3 h-6 w-6 text-primary" aria-hidden />
            <h2 className="flex items-center gap-1 text-sm font-black text-foreground">
              {title}
              <ChevronRight
                className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </Link>
        ))}
      </div>

      {/* Dernières commandes */}
      <section className="rounded-sm border border-border bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-foreground">{t("dashboard.recentTitle")}</h2>
          <Link
            href="/compte/commandes"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t("dashboard.allOrders")}
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("dashboard.emptyOrders")}</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              {t("common.shopCta")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li key={order.orderNumber} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/compte/commandes/${order.orderNumber}`}
                    className="block text-sm font-black text-foreground hover:text-primary"
                  >
                    {order.orderNumber}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {t("orders.orderedOn", {
                      date: dateFormatter.format(new Date(order.createdAt)),
                    })}
                  </span>
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {ORDER_STATUS_LABELS[order.status][language]} ·{" "}
                  {PAYMENT_STATUS_LABELS[order.paymentStatus][language]}
                </span>
                <span className="text-sm font-black whitespace-nowrap text-foreground">
                  {formatPrice(order.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-sm border border-border bg-white px-4 py-3 text-xs text-muted-foreground">
        {t("guestNotice")}
      </p>
    </AccountShell>
  );
}
