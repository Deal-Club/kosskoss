import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { Hero, ProductRail } from "@/components/kk/home";
import {
  BrandFocus,
  CategoryPills,
  DiagnosticReminder,
  InsightsSection,
  PromisesRow,
  ServicesBand,
} from "@/components/kk/home-sections";
import { RoutinesRail } from "@/components/kk/routines";
import { NewsletterBand } from "@/components/kk/newsletter";
import { getHomeProducts, getHomeTestimonials } from "@/server/kk/home";
import { getHomeFaq } from "@/server/kk/home-faq";
import { getShopNavigation } from "@/server/kk/navigation";
import { getRoutines } from "@/server/kk/routines";
import { getBrandFocus } from "@/server/kk/brand-focus";
import { getQuestions } from "@/server/kk/diagnostic-data";
import { AVANT_APRES } from "@/data/kk/avant-apres";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { CONTACT } from "@/config/brand";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type HomeParams = Promise<{ locale: Locale }>;

/**
 * Lien WhatsApp de la bande services. Même source que le bouton flottant et le
 * pied de page : la ligne dédiée si elle est configurée, sinon le téléphone de
 * la société. Vide, le lien ne s'affiche pas.
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
      "Concept-store cosmétique multimarque au Cameroun. Des routines prêtes à l'emploi par préoccupation, un diagnostic beauté en cinq questions, paiement Mobile Money.",
    alternates: alternatesFor("/", locale),
  };
}

/**
 * Page d'accueil, bâtie sur les treize blocs de la structure fournie par le
 * client (colonne « STRUCTURE DU SITE » de la maquette « Toutes pages », voir
 * docs/design-references/kks/).
 *
 * Le principe qui commande l'ordre : les modules « solution » — diagnostic,
 * routines — passent avant les modules « produit » — catégories, best-sellers.
 * C'est l'approche « Besoins / solution » demandée, et c'est l'inverse de
 * l'accueil précédent, qui plaçait trois blocs produit devant le diagnostic et
 * ne proposait aucune routine.
 *
 * Les blocs 6+7 et 8+9+10 sont composés EN COLONNES et non en bandes pleine
 * largeur : c'est ce qui permet de tenir treize blocs sans allonger la page,
 * et c'est aussi ce qui autorise des titres plus petits — une bande pleine
 * largeur appelle un gros titre pour ne pas paraître vide.
 */
export default async function Home({ params }: { params: HomeParams }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [products, testimonials, groups, faq, routines, brandFocus, questions] = await Promise.all([
    getHomeProducts(8),
    getHomeTestimonials(3),
    getShopNavigation(),
    // Les réponses viennent de la page /faq : une seule source, deux affichages.
    getHomeFaq(locale, 8),
    getRoutines(locale, 5),
    getBrandFocus(),
    getQuestions(),
  ]);

  // Un seul rail produit désormais, contre deux auparavant : le second faisait
  // de l'accueil un catalogue là où la maquette en fait une entrée par le
  // besoin.
  const bestsellers = products.slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />

      {/* Balisage Organization + WebSite, à déclarer une seule fois pour tout
          le site : c'est ce qui rattache la boutique à une entité identifiée
          pour Google et pour les moteurs de réponse. L'adresse postale reste
          absente tant que les mentions légales portent « À COMPLÉTER » : mieux
          vaut pas d'adresse qu'une fausse. */}
      <OrganizationJsonLd
        sameAs={[
          `https://instagram.com/${CONTACT.social.instagram}`,
          `https://facebook.com/${CONTACT.social.facebook}`,
        ]}
      />

      <main className="flex-1">
        {/* 1 — Hero */}
        <Hero />

        {/* 2 — Promesses clés. En deuxième position et non en onzième :
            l'identité de marque désigne la peur de la contrefaçon comme le
            premier frein de la cible. */}
        <PromisesRow />

        {/* Achat rapide : les routines prêtes à l'emploi. Le bloc qui manquait
            entièrement, et le cœur de la promesse de marque. */}
        <RoutinesRail routines={routines} />

        {/* Focus marque, avec le module de diagnostic en carte.
            Il est placé ENTRE les deux sections produit — routines au-dessus,
            catégories et best-sellers en dessous — plutôt qu'avant elles. Son
            fond vert profond sépare alors deux zones claires au lieu d'en
            précéder une seule : la page reprend son souffle au milieu, là où
            elle enchaînait le plus de contenu.
            Conséquence assumée : le module de diagnostic passe après les
            routines, alors que la structure du client le numérote avant. Les
            deux mènent au même endroit, et la porte la plus courte — la routine
            déjà composée — vient désormais en premier. */}
        <BrandFocus focus={brandFocus} questions={questions.map((q) => q.title)} />

        {/* Catégories et best-sellers, côte à côte comme sur la
            maquette. Les produits seuls arrivent ici, après les routines.

            La colonne des catégories est COLLANTE : elle est deux fois moins
            haute que la grille de produits qu'elle accompagne, et laissait donc
            un grand vide sous elle pendant qu'on faisait défiler les
            best-sellers. Elle suit désormais la lecture, ce qui garde l'entrée
            par le rayon disponible au moment où l'on regarde les produits.
            `self-start` est indispensable : sans lui, la grille étire la colonne
            à sa hauteur et `sticky` n'a plus de course. */}
        <section className="section mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <CategoryPills groups={groups} />
            </div>
            {bestsellers.length > 0 && (
              <ProductRail
                eyebrow="Les plus choisis"
                title="Nos best-sellers"
                action="Tout voir"
                products={bestsellers}
                bare
              />
            )}
          </div>
        </section>

        {/* 8 + 9 + 10 — Conseils, avant/après et avis.
            Une seule section, un seul cadre, un seul titre : les trois blocs
            de la structure client disent la même chose — la preuve — et trois
            cartes autonomes côte à côte se disputaient l'attention au lieu de
            se compléter. L'avant/après reste masqué tant qu'aucun cas réel
            n'est fourni (voir src/data/kk/avant-apres.ts) ; le nombre de
            colonnes s'ajuste alors tout seul. */}
        <InsightsSection entries={faq} cases={AVANT_APRES} testimonials={testimonials} />

        <DiagnosticReminder />

        {/* 11 — Services & engagements. */}
        <ServicesBand whatsappUrl={WHATSAPP_URL} />

        {/* 12 — Newsletter. Seul bloc du site qui porte encore le motif de
            marque : une ligne de titre, un champ, aucun texte courant.
            Sans enveloppe : le `pt-14` qui était posé ici s'ajoutait au padding
            propre du bandeau ET à celui de la bande services au-dessus — trois
            espacements empilés pour un seul écart. */}
        <NewsletterBand locale={locale} />
      </main>

      {/* 13 — Footer */}
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
