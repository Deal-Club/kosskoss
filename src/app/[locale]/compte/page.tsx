import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Package, Sparkles, ChevronRight, Heart, MapPin, ShieldCheck } from "lucide-react";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { AccountLogout } from "@/components/kk/account";
import { requireCustomer } from "@/server/customerSession";
import { getAccountOrders } from "@/server/kk/account";
import { formatFcfa } from "@/lib/kk/format";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export const metadata: Metadata = {
  title: "Mon compte — KossKoss Select",
  robots: { index: false, follow: false },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export default async function AccountPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await requireCustomer(locale, "/compte");
  const orders = await getAccountOrders(customer.id);

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Espace client</p>
              <h1 className="mt-2 text-deep">Bonjour {customer.firstName}</h1>
            </div>
            <AccountLogout />
          </div>

          {/* Raccourcis de l'espace client. Les favoris y figurent parce qu'une
              fois connecté, la sélection est enregistrée sur le compte : elle
              doit être joignable depuis le tableau de bord et pas seulement
              depuis l'en-tête. */}
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { href: "/favoris", label: "Mes favoris", icon: Heart },
              { href: "/compte/adresses", label: "Mes adresses", icon: MapPin },
              { href: "/compte/informations", label: "Mes informations", icon: ShieldCheck },
              { href: "/diagnostic", label: "Refaire mon diagnostic", icon: Sparkles },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-deep transition hover:border-deep/40 hover:bg-sand/50"
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>

          <h2 className="mt-10 flex items-center gap-2 text-lg text-deep">
            <Package className="h-5 w-5" /> Mes commandes
          </h2>

          {orders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground">Vous n&rsquo;avez pas encore de commande.</p>
              <Link href="/soins-visage" className="mt-3 inline-block text-sm font-semibold text-deep underline underline-offset-4">
                Découvrir la boutique
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {orders.map((o) => (
                <li key={o.orderNumber}>
                  <Link
                    href={`/compte/commandes/${o.orderNumber}`}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-deep">{o.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(o.createdAt)} · {o.itemCount} article{o.itemCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="hidden rounded-full bg-sand px-3 py-1 text-xs font-medium text-deep sm:inline">
                      {o.statusLabel}
                    </span>
                    <span className="figure text-sm font-semibold text-deep">{formatFcfa(o.totalFcfa)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
