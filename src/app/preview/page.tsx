import type { Metadata } from "next";
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
import { MOCK_SELECTION, MOCK_POPULAR } from "@/data/kk/home-mock";

// Page de prévisualisation du design system KossKoss Select — données de
// démonstration, non branchée sur la base. Jamais indexée.
export const metadata: Metadata = {
  title: "Aperçu design — KossKoss Select",
  robots: { index: false, follow: false },
};

export default function PreviewHomePage() {
  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <SkinTypeStrip />
        <ProductRail
          eyebrow="À découvrir"
          title="La sélection du moment"
          action="Tout voir"
          products={MOCK_SELECTION}
        />
        <DiagnosticPromo />
        <ProductRail
          eyebrow="Les favoris"
          title="Les plus choisis"
          action="Voir la boutique"
          products={MOCK_POPULAR}
        />
        <EditorialBlock />
        <Testimonials />
        <TrustRow />
      </main>

      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
