import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { Hero, ProductRail } from "@/components/kk/home";
import {
  CategoryPills,
  DiagnosticReminder,
  InsightsSection,
  PromisesRow,
} from "@/components/kk/home-sections";
import { RoutinesRail } from "@/components/kk/routines";
import { AvantApresSection } from "@/components/kk/avant-apres-section";
import { BrandsShowcase } from "@/components/kk/brands-showcase";
import { getBrandShowcase } from "@/server/kk/brands";
import { getHomeProducts, getHomeTestimonials } from "@/server/kk/home";
import { getHomeFaq } from "@/server/kk/home-faq";
import { getShopNavigation } from "@/server/kk/navigation";
import { getRoutines } from "@/server/kk/routines";
import { AVANT_APRES, AVANT_APRES_CAS } from "@/data/kk/avant-apres";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { CONTACT } from "@/config/brand";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type HomeParams = Promise<{ locale: Locale }>;

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

  const [products, testimonials, groups, faq, routines, brands] = await Promise.all([
    getHomeProducts(12),
    getHomeTestimonials(3),
    getShopNavigation(),
    // Les réponses viennent de la page /faq : une seule source, deux affichages.
    getHomeFaq(locale, 8),
    getRoutines(locale, 5),
    // Douze : le catalogue en compte exactement douze, et six par rangée les
    // range en deux lignes pleines. Au-delà, les moins fournies passeraient à
    // la trappe — voir getBrandShowcase pour l'ordre retenu.
    getBrandShowcase(12),
  ]);

  // Un seul rail produit désormais, contre deux auparavant : le second faisait
  // de l'accueil un catalogue là où la maquette en fait une entrée par le
  // besoin.
  //
  // Douze références et non quatre : le rail défile en boucle, et une liste
  // trop courte fait repasser les mêmes produits toutes les quelques secondes
  // — la boucle devient alors visible, ce qui est exactement ce qu'elle doit
  // éviter. `getHomeProducts` alterne les marques, donc les douze ne viennent
  // pas de la même maison.
  const bestsellers = products.slice(0, 12);

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

        {/* Preuve par l'image, à la place du focus marque.
            Même rôle dans la page : un fond vert profond qui sépare deux zones
            claires et fait reprendre son souffle au milieu du parcours. Mais
            une preuve visuelle porte plus loin qu'un nom de maison auprès d'une
            clientèle qui a déjà vu beaucoup de promesses.
            Le comparateur ne s'affiche que si un cas réel est fourni ; sinon
            la colonne de texte tient seule (voir avant-apres-section.tsx). */}
        <AvantApresSection cas={AVANT_APRES_CAS} />

        {/* Catégories et best-sellers, côte à côte comme sur la
            maquette. Les produits seuls arrivent ici, après les routines.

            LES DEUX CARTES ONT LA MÊME HAUTEUR, à la demande du client : elles
            sont posées côte à côte, et deux cadres inégaux se lisaient comme un
            bloc inachevé.

            Ce qui a été abandonné pour l'obtenir : la colonne des catégories
            était COLLANTE, pour rester disponible pendant qu'on faisait défiler
            les best-sellers. Une colonne qui remplit toute la hauteur de sa
            rangée n'a plus de course dans laquelle glisser — les deux réglages
            s'excluent. Le rail de best-sellers défilant désormais
            horizontalement plutôt qu'en grille haute, la page est bien moins
            longue à cet endroit et le collant y perdait de toute façon son
            intérêt. */}
        <section className="section mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
            <CategoryPills groups={groups} />
            {bestsellers.length > 0 && (
              <ProductRail
                eyebrow="Les plus choisis"
                title="Nos best-sellers"
                action="Tout voir"
                products={bestsellers}
                bare
                carousel
              />
            )}
          </div>
        </section>

        {/* Les maisons distribuées, juste après le rayon.
            Sa place ici tient à ce qu'elle répond : on vient de faire défiler
            des produits, la question qui suit est « à qui j'achète ? ». Sur un
            marché où la contrefaçon est le premier frein — c'est l'identité de
            marque qui le dit —, montrer douze maisons identifiées vaut mieux
            que de l'affirmer en une ligne de réassurance.
            Elle ne s'insère pas entre le diagnostic et « Bon à savoir », qui
            forment un couple : la question « par où commencer ? » doit rester
            collée aux conseils qui y répondent. */}
        <BrandsShowcase brands={brands} />

        {/* Le rappel du diagnostic passe DEVANT la section « Bon à savoir »,
            à la demande du client. Il vient donc directement après les
            best-sellers : on sort du rayon, et la question « vous ne savez pas
            par où commencer ? » tombe pile sur qui vient de faire défiler des
            produits sans se décider. Les conseils et les avis, eux, se lisent
            plus volontiers après cette porte de sortie qu'avant. */}
        <DiagnosticReminder />

        {/* 8 + 9 + 10 — Conseils, avant/après et avis.
            Une seule section, un seul cadre, un seul titre : les trois blocs
            de la structure client disent la même chose — la preuve — et trois
            cartes autonomes côte à côte se disputaient l'attention au lieu de
            se compléter. L'avant/après reste masqué tant qu'aucun cas réel
            n'est fourni (voir src/data/kk/avant-apres.ts) ; le nombre de
            colonnes s'ajuste alors tout seul. */}
        <InsightsSection entries={faq} cases={AVANT_APRES} testimonials={testimonials} />

      </main>

      {/* 13 — Footer */}
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
