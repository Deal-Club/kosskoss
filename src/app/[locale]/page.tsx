import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import {
  Hero,
  SkinTypeStrip,
  ProductRail,
  DiagnosticPromo,
  EditorialBlock,
  Testimonials,
  TrustRow,
} from "@/components/kk/home";
import { getHomeProducts } from "@/server/kk/home";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type HomeParams = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: HomeParams }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: `${BRAND.name} — ${BRAND.slogan}`,
    description:
      "Concept-store cosmétique multimarque au Cameroun. Des soins sélectionnés avec exigence, un diagnostic beauté personnalisé, paiement Mobile Money.",
    alternates: alternatesFor("/", locale),
  };
}

export default async function Home({ params }: { params: HomeParams }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Produits mis en avant, lus en base. Liste vide tolérée : les rails se
  // masquent tant que le catalogue n'est pas peuplé.
  const products = await getHomeProducts(8);
  const selection = products.slice(0, 4);
  const popular = products.slice(4, 8);

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <SkinTypeStrip />
        {selection.length > 0 && (
          <ProductRail
            eyebrow="À découvrir"
            title="La sélection du moment"
            action="Tout voir"
            products={selection}
          />
        )}
        <DiagnosticPromo />
        {popular.length > 0 && (
          <ProductRail
            eyebrow="Les favoris"
            title="Les plus choisis"
            action="Voir la boutique"
            products={popular}
          />
        )}
        <EditorialBlock />
        <Testimonials />
        <TrustRow />
      </main>

      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
