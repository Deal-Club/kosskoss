import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { Hero, ProductRail } from "@/components/kk/home";
import { InsightsSection, PromisesRow } from "@/components/kk/home-sections";
import { RoutinesRail } from "@/components/kk/routines";
import { RaisonDetre } from "@/components/kk/raison-detre";
import { GammeSection } from "@/components/kk/gamme-section";
import { AvisClients } from "@/components/kk/avis-clients";
import { getHomeProducts, getHomeTestimonials, getReviewsSummary } from "@/server/kk/home";
import { getHomeFaq } from "@/server/kk/home-faq";
import { getRoutines } from "@/server/kk/routines";
import { getBrandFocus } from "@/server/kk/brand-focus";
import { getRaisonDetre } from "@/server/kk/raison-detre";
import { AVANT_APRES } from "@/data/kk/avant-apres";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { CONTACT } from "@/config/brand";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type HomeParams = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: HomeParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: `${BRAND.name} · ${t("slogan")}`,
    description: t("metaDescription"),
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
  const t = await getTranslations({ locale, namespace: "home" });

  // `getShopNavigation` et `getBrandShowcase` ne sont plus appelés ici : la
  // carte des catégories et la section « Nos maisons » ont été retirées de
  // l'accueil. Deux requêtes de moins à chaque rendu de la page la plus vue.
  const [products, testimonials, avisResume, faq, routines, focus, raisonDetre] = await Promise.all([
    getHomeProducts(12, locale),
    // Trois, et pas un de plus : la section les montre sur UNE SEULE rangée.
    // À six, la grille repassait à la ligne et la section doublait de hauteur
    // pour dire la même chose.
    getHomeTestimonials(3, locale),
    getReviewsSummary(),
    // Les réponses viennent de la page /faq : une seule source, deux affichages.
    getHomeFaq(locale, 8),
    getRoutines(locale, 5),
    // La maison mise en avant dans « Notre gamme ». Renvoie `null` si elle n'a
    // plus aucune référence servable : le bloc se masque alors tout seul.
    getBrandFocus(locale),
    // Chiffres du catalogue et routine d'exemple pour « Notre raison d'être ».
    // Comptés en base : « 71 références » ne peut pas se désaligner du jour où
    // l'on en retire dix.
    getRaisonDetre(),
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
    <div className="flex min-h-screen flex-col">
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

        {/* Notre raison d'être — trois obstacles, trois réponses chiffrées,
            puis l'anatomie d'une routine réelle.

            Elle remplace un comparateur à curseur sur un visage, refusé par le
            client : le visuel promettait un résultat cutané là où la section
            promet un parcours d'achat simplifié. Voir raison-detre.tsx.

            Elle garde le même rôle dans la page : un fond vert profond qui
            sépare deux zones claires et fait reprendre son souffle au milieu du
            parcours. */}
        <RaisonDetre data={raisonDetre} />

        {/* Les best-sellers, seuls et pleine largeur.

            LA CARTE « PAR OÙ COMMENCER » A ÉTÉ RETIRÉE. Elle occupait le tiers
            gauche de cette rangée avec une grille de pastilles de catégories, et
            contraignait tout le reste : le rail de produits tenait dans les deux
            tiers restants, les deux cartes devaient s'égaliser en hauteur, et la
            colonne des catégories doublait une navigation déjà complète dans
            l'en-tête — méga-menu compris. Le rayon se parcourt maintenant d'un
            bord à l'autre de la section, ce qu'un carrousel demande : plus de
            produits visibles d'un coup d'œil, et une piste assez longue pour que
            le défilement ait un intérêt.

            `CategoryPills` reste défini dans `home-sections.tsx`, sans appelant :
            le jour où une entrée par catégorie redevient utile sur l'accueil,
            c'est une ligne à remettre. */}
        <section className="section mx-auto max-w-7xl px-6">
          {/* `grid-cols-[minmax(0,1fr)]` : SANS LUI, TOUTE LA PAGE DÉBORDE.
              Le rail est un carrousel : sa piste, les douze cartes mises bout à
              bout, mesure plusieurs milliers de pixels. Dans une colonne `auto`
              — ce que le navigateur choisit faute de déclaration — cette piste
              dicte la largeur, et c'est la PAGE entière qui part en défilement
              horizontal, en emportant l'en-tête et le hero (mesuré à 6 118 px de
              large sur un écran de 390). `minmax(0, 1fr)` borne la colonne au
              cadre ; la piste retrouve alors son rôle, défiler DANS son propre
              cadre (`overflow-x-auto`) au lieu de l'élargir. La grille survit au
              retrait de la carte catégories pour cette seule raison. */}
          <div className="grid grid-cols-[minmax(0,1fr)]">
            {bestsellers.length > 0 && (
              <ProductRail
                eyebrow={t("bestsellers.eyebrow")}
                title={t("bestsellers.title")}
                action={t("bestsellers.action")}
                products={bestsellers}
                bare
                carousel
              />
            )}
          </div>
        </section>

        {/* LA SECTION « NOS MAISONS » A ÉTÉ RETIRÉE.
            Elle alignait douze logos de marques distribuées juste après le
            rayon, pour répondre à « à qui j'achète ? ». Le parcours va
            désormais directement des best-sellers aux préoccupations traitées.
            Le composant `BrandsShowcase` et la requête `getBrandShowcase`
            restent dans le dépôt mais n'ont plus aucun appelant : à supprimer
            si la décision se confirme. */}

        {/* « Un problème, une réponse » — les préoccupations nommées, chacune
            ouvrant son rayon filtré.

            Elle précède immédiatement « Vous ne savez pas par où commencer ? »,
            et les deux se répondent : celle-ci s'adresse à qui SAIT ce qui le
            gêne et lui ouvre le rayon correspondant ; celle-là recueille ceux
            qui ne savent pas se situer et les envoie au diagnostic. Ensemble,
            elles couvrent les deux façons d'arriver sur une boutique de soin. */}
        <GammeSection focus={focus} />


        {/* 8 + 9 — Conseils et avant/après, MAINTENANT AVANT LES AVIS.
            L'ordre était inverse. Les questions qu'on se pose — comment on
            choisit, en combien de temps ça agit, ce que ça donne en photo — sont
            les dernières objections avant l'achat ; la parole des clientes vient
            les confirmer, pas les précéder. La FAQ ferme donc l'argumentaire et
            les avis le scellent, juste avant le pied de page.
            L'avant/après reste masqué tant qu'aucun cas réel n'est fourni (voir
            src/data/kk/avant-apres.ts) ; le nombre de colonnes s'ajuste alors
            tout seul. */}
        <InsightsSection entries={faq} cases={AVANT_APRES} />

        {/* Les avis en dernier mot, juste avant le pied de page — la position
            qu'occupe la preuve sociale quand tout le reste a été dit. La section
            disparaît d'elle-même tant qu'aucun avis n'est publié en base. */}
        <AvisClients avis={testimonials} resume={avisResume} />

      </main>

      {/* 13 — Footer */}
      <SiteFooter />
    </div>
  );
}
