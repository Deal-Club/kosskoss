import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { requireCustomer } from "@/server/customerSession";
import { getAccountOrder } from "@/server/kk/account";
import { formatFcfa } from "@/lib/kk/format";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; orderNumber: string }>;

export const metadata: Metadata = {
  title: "Ma commande — KossKoss Select",
  robots: { index: false, follow: false },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export default async function AccountOrderPage({ params }: { params: Params }) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const customer = await requireCustomer(locale, `/compte/commandes/${orderNumber}`);
  const order = await getAccountOrder(customer.id, orderNumber);
  if (!order) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-12">
          <Link href="/compte" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-deep">
            <ArrowLeft className="h-4 w-4" /> Mes commandes
          </Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-deep">{order.orderNumber}</h1>
            <span className="rounded-full bg-sand px-3 py-1 text-sm font-medium text-deep">{order.statusLabel}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Passée le {formatDate(order.createdAt)}</p>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <ul className="divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span className="text-foreground">
                    {i.brand} {i.name}
                    {i.variantLabel ? ` · ${i.variantLabel}` : ""}
                    <span className="text-muted-foreground"> × {i.quantity}</span>
                  </span>
                  <span className="figure shrink-0 text-deep">{formatFcfa(i.lineTotalFcfa)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold text-deep">Total</span>
              <span className="figure text-xl font-semibold text-deep">{formatFcfa(order.totalFcfa)}</span>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Livraison</dt>
              <dd className="mt-1 text-foreground">{order.location}</dd>
              <dd className="text-muted-foreground">{order.phone}</dd>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paiement</dt>
              <dd className="mt-1 text-foreground">{order.paymentLabel}</dd>
            </div>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
