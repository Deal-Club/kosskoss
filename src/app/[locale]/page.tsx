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
import {
  BrandStrip,
  HomeCta,
  HomeFaq,
  MaisonSection,
  UniverseCards,
} from "@/components/kk/home-sections";
import { getHomeProducts, getHomeTestimonials } from "@/server/kk/home";
import { getHomeFaq } from "@/server/kk/home-faq";
import { getShopBrands, getShopNavigation } from "@/server/kk/navigation";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { CONTACT } from "@/config/brand";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type HomeParams = Promise<{ locale: Locale }>;

/**
 * Lien WhatsApp de l'appel à l'action. Même source que le bouton flottant et le
 * pied de page : la ligne dédiée si elle est configurée, sinon le téléphone de
 * la société. Vide, le bouton ne s'affiche pas.
 */
const WHATSAPP_DIGITS =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || CONTACT.phone.replace(/\D/g, "");
const WHATSAPP_URL = WHATSAPP_DIGITS
  ? `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(
      "Bonjour, j'aimerais un conseil pour choisir mes soins.",
    )}`
  : undefined;

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
  // Avis réels modérés : la section se masque tant qu'il n'y en a aucun.
  // Univers et marques servent aux sections de navigation et de réassurance ;
  // ils sont comptés en base, jamais écrits à la main.
  const [products, testimonials, groups, brands, faq] = await Promise.all([
    getHomeProducts(12),
    getHomeTestimonials(3),
    getShopNavigation(),
    getShopBrands(),
    // Les réponses viennent de la page /faq : une seule source, deux affichages.
    getHomeFaq(locale, 8),
  ]);
  // « À découvrir » tient sur deux rangées de quatre ; « Les plus choisis »
  // garde une seule rangée, pour rester une pointe et non un second catalogue.
  const selection = products.slice(0, 8);
  const popular = products.slice(8, 12);
  const productCount = groups.reduce(
    (sum, group) => sum + group.categories.reduce((n, c) => n + c.productCount, 0),
    0,
  );

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />

      {/* Balisage Organization + WebSite, à déclarer une seule fois pour tout
          le site : c'est ce qui rattache la boutique à une entité identifiée
          pour Google et pour les moteurs de réponse. Le composant existait déjà
          mais n'était monté sur aucune page — le balisage n'était donc jamais
          émis. L'adresse postale reste absente tant que les mentions légales
          portent « À COMPLÉTER » : mieux vaut pas d'adresse qu'une fausse. */}
      <OrganizationJsonLd
        sameAs={[
          `https://instagram.com/${CONTACT.social.instagram}`,
          `https://facebook.com/${CONTACT.social.facebook}`,
        ]}
      />

      <main className="flex-1">
        <Hero />
        <SkinTypeStrip />
        {/* Accès direct aux rayons : sans cette section, la seule porte vers une
            catégorie précise était le menu de l'en-tête. */}
        <UniverseCards groups={groups} />
        {selection.length > 0 && (
          <ProductRail
            eyebrow="À découvrir"
            title="La sélection du moment"
            action="Tout voir"
            products={selection}
          />
        )}
        <BrandStrip brands={brands} />
        <DiagnosticPromo />
        {popular.length > 0 && (
          <ProductRail
            eyebrow="Les favoris"
            title="Les plus choisis"
            action="Voir la boutique"
            products={popular}
          />
        )}
        <MaisonSection
          productCount={productCount}
          brandCount={brands.length}
          universeCount={groups.length}
        />
        <EditorialBlock />
        <Testimonials testimonials={testimonials} />
        <TrustRow />
        {/* Les objections se lèvent avant l'appel à l'action, pas après. */}
        <HomeFaq entries={faq} />
        <HomeCta whatsappUrl={WHATSAPP_URL} />
      </main>

      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
