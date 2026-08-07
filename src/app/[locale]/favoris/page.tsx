import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { FavoritesView } from "@/components/kk/favorites-view";
import { PatternBackdrop } from "@/components/kk/pattern-backdrop";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export const metadata: Metadata = {
  title: "Mes favoris — KossKoss Select",
  description: "Les produits que vous avez mis de côté.",
  // Liste personnelle : rien à indexer.
  robots: { index: false, follow: true },
};

export default async function FavoritesPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        {/* Bandeau de tête, au motif de la marque comme les pages boutique. */}
        <section className="relative overflow-hidden bg-deep text-primary-foreground">
          <PatternBackdrop align="center" />
          <div className="relative mx-auto max-w-4xl px-6 py-14 text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary-foreground/60">
              Ma sélection
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl">Mes favoris</h1>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/75">
              Les produits que vous avez mis de côté, prêts à passer au panier.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-10">
          <FavoritesView />
        </section>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
