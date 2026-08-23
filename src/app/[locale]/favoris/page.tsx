import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { PatternBackdrop } from "@/components/kk/pattern-backdrop";
import { FavoritesView } from "@/components/kk/favorites-view";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wishlist" });
  return {
    title: t("metaTitle"),
    description: t("intro"),
    // Liste personnelle : rien à indexer.
    robots: { index: false, follow: true },
  };
}

export default async function FavoritesPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "wishlist" });

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        {/* Bandeau de tête au motif de marque, comme tous les bandeaux sombres
            hors accueil. */}
        <section className="relative overflow-hidden bg-deep text-primary-foreground">
          <PatternBackdrop align="center" />
          <div className="relative mx-auto max-w-4xl px-6 py-12 text-center">
            <p className="eyebrow eyebrow-on-dark">{t("pageEyebrow")}</p>
            <h1 className="mt-3">{t("pageTitle")}</h1>
            <p className="lead mx-auto mt-3 max-w-xl text-primary-foreground">{t("pageIntro")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-10">
          <FavoritesView />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
