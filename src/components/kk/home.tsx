import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import type { KKProductView } from "@/types/kk";
import { ProductCard } from "./product-card";
import { ProductCarousel } from "./product-carousel";

/* ------------------------------------------------------------- 1. Hero -- */

/**
 * Hero, recomposé sur la maquette client.
 *
 * Trois différences de fond avec la version précédente :
 *
 *  — LE TITRE JOUE DE DEUX GRAISSES et non de deux tailles. La maquette écrit
 *    « Des soins conçus pour sublimer » en gras et « les peaux noires &
 *    métissées » en léger, dans la même serif. Le relief vient de la graisse,
 *    ce qui permet de descendre de 60 px à 44 px sans rien perdre — le retour
 *    client tenant précisément sur des « textes trop grands ».
 *
 *  — LA PHOTO EST LE FOND, ET ELLE EST VOILÉE. Elle occupe tout le cadre à
 *    toutes les tailles, et un voile sombre (`kk-hero-voile`) passe dessus pour
 *    porter le texte, qui est clair. Le voile a deux régimes — vertical sous
 *    `lg` où le texte est en bas, horizontal au-delà où il passe à gauche —
 *    parce qu'un seul dégradé ne peut pas suivre un texte qui change de place.
 *    Il est en noir pur : le vert de la marque virait le beige de la photo au
 *    kaki, le noir se contente d'assombrir. Détail dans `globals.css`.
 *
 *  — LES TEXTES SONT CLAIRS, dans la nuance crème de la marque plutôt qu'en
 *    blanc pur, qui vibre sur une photo. Le titre garde le blanc sur son second
 *    membre, pour que les deux graisses se lisent aussi comme deux valeurs.
 *
 *  — L'IMAGE VA JUSQU'AU BORD. Elle sortait d'un cadre arrondi flottant au
 *    milieu du crème ; elle occupe désormais toute la moitié droite, comme sur
 *    la maquette, ce qui lui donne le poids qu'un visuel de tête doit avoir.
 */
export function Hero() {
  const t = useTranslations("home");
  return (
    // Le fond de section ne se voit qu'au chargement, la photo le couvrant
    // entièrement dès qu'elle arrive. Il reste au vert profond de la marque :
    // c'est la valeur vers laquelle le hero voilé tend, donc celle qui ne
    // produit aucun saut quand l'image se substitue à elle.
    <section className="relative overflow-hidden bg-deep">
      {/* Pas de conteneur centré ici, contrairement au reste de la page : la
          grille prend toute la largeur de l'écran, sans quoi la colonne image
          s'arrêterait au bord du conteneur (1280 px) et laisserait une bande
          de fond nu à droite sur les grands écrans.

          Le texte, lui, doit rester aligné sur la gouttière commune. D'où la
          demi-colonne de gauche bornée à 44rem — la moitié exacte de
          `max-w-7xl`, redéfini à 88rem dans globals.css — et poussée contre le
          centre par `justify-self-end` : son bord gauche retombe au pixel près
          sur celui des sections suivantes, à n'importe quelle résolution. Les
          deux valeurs vont par paire : si la gouttière bouge, celle-ci suit. */}
      {/* `grid-cols-[minmax(0,1fr)]` — LE CORRECTIF DU TITRE COUPÉ SUR MOBILE.
          Sous `lg`, cette grille n'avait AUCUNE colonne déclarée : le seul
          enfant en flux tombait dans une colonne implicite en `auto`, que
          Chrome dimensionne sur le contenu. La colonne prenait donc les 36 rem
          du `max-w-xl` intérieur — 576 px — quelle que soit la largeur de
          l'écran, et la section les rognait au passage (`overflow-hidden`).
          Résultat visible : « Des soins conçus po… » tranché net au bord droit,
          avec exactement les mêmes retours à la ligne à 320, 390 et 600 px —
          la signature d'un bloc qui ne se remet jamais en page.
          `minmax(0, 1fr)` borne la colonne à la largeur du cadre. C'est la même
          protection que `lg:grid-cols-2`, qui vaut `repeat(2, minmax(0,1fr))`
          chez Tailwind — d'où un desktop resté correct pendant que le mobile
          était cassé. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-center lg:grid-cols-2 lg:gap-x-0">
        {/* CE BLOC EST POSÉ SUR LA PHOTO.
            Elle passe en fond absolu du cadre entier (voir plus bas) : le texte
            doit donc porter un `z-10`, sans quoi l'image — qui le suit dans le
            DOM — lui passerait devant.

            Le `pt` réserve au visuel la bande haute du cadre : c'est lui qui
            donne au hero sa composition mobile, photo en haut, texte en bas sur
            la partie dense du voile. Il retombe au padding normal dès `lg`, où
            les deux occupent chacun leur colonne.

            IL A VALU 14 REM (224 px), ET 18 REM AU-DELÀ DE 640 PX. Ajoutés à
            l'en-tête et au bandeau d'annonce, cela faisait près de 340 px avant
            le premier mot — la moitié d'un écran de téléphone occupée par une
            photo dont le sujet tient dans son tiers supérieur.

            Il tient à 5 rem (80 px), soit un tiers de la valeur d'origine. La
            photo garde une bande franche au-dessus du titre, et le titre, le
            chapô et LES DEUX BOUTONS entrent ensemble dans le premier écran
            d'un téléphone — c'est le seul critère qui compte ici : un hero dont
            l'appel à l'action tombe sous la ligne de flottaison ne sert à rien.
            Le voile est calé sur ce découpage : voir `globals.css`. */}
        <div className="relative z-10 w-full lg:max-w-[44rem] lg:justify-self-end">
          {/* `kk-hero-texte` : l'ombre portée qui détache les lettres de la
              photo au contact, et permet de garder le voile discret. */}
          <div className="kk-hero-texte max-w-xl px-6 pb-10 pt-20 sm:pt-28 lg:py-20">
            {/* Le sur-titre « L'expertise dédiée à votre peau », précédé de son
                filet laiton, a été retiré : le titre ouvre désormais le hero.
                Les délais d'apparition ont donc tous remonté d'un cran (80 ms),
                sans quoi la page resterait vide le temps du palier laissé
                vacant. */}
            {/* Titre d'un seul tenant : une famille, une graisse, une couleur.
                Il était coupé en deux — « Des soins conçus pour sublimer » en
                600, « les peaux noires & métissées » en 400 et en blanc pur —
                pour reprendre le contraste de la maquette. Sur la photo voilée,
                cette rupture au milieu d'une phrase se lit moins comme un effet
                que comme un accident de rendu : deux moitiés qui semblent ne pas
                appartenir au même titre. Le crème plutôt que le blanc pur : sur
                une photo, un blanc pur en serif de 41 px vibre au bord des
                lettres, la nuance de la marque tient la même lisibilité en
                restant posée. */}
            <h1 className="kk-rise text-primary-foreground" style={{ "--d": "0ms" } as React.CSSProperties}>
              {t("hero.title")}
            </h1>

            {/* Le chapô quitte le gris d'encre de `.lead`, illisible sur une
                photo voilée, pour le crème de la marque à 90 %. */}
            <p
              className="lead kk-rise mt-5 max-w-md text-primary-foreground/90"
              style={{ "--d": "80ms" } as React.CSSProperties}
            >
              {t("hero.subtitle")}
            </p>

            {/* Deux portes, dans l'ordre d'engagement décroissant.
                « Trouvez votre routine » passe en tête et prend le laiton plein :
                c'est la promesse du chapô — « des routines déjà composées, pour
                ne pas avoir à choisir seul » —, donc la suite naturelle du
                titre. Le diagnostic reste offert juste à côté, en contour, pour
                qui veut d'abord être conseillé. Un hero ne doit porter qu'une
                seule action dominante : deux boutons d'égale force ne
                partageraient pas les clics, ils les feraient hésiter. */}
            <div
              className="kk-rise mt-8 flex flex-wrap items-center gap-4"
              style={{ "--d": "160ms" } as React.CSSProperties}
            >
              {/* Bouton d'action en laiton plein. Il se remplit de vert profond
                  au survol (`kk-fill-deep`) — l'effet inverse serait illisible
                  sur un fond déjà sombre.
                  Le texte du bouton ne prend pas l'ombre du hero : posé sur un
                  aplat laiton, il n'en a pas besoin et elle l'empâterait. */}
              <Link
                href="/routines"
                className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-deep [text-shadow:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-deep"
              >
                {t("hero.ctaRoutine")}
                <Sparkles className="h-4 w-4 shrink-0" />
              </Link>
              {/* Contour clair à 55 %, au-dessus des 3:1 qu'un contrôle doit
                  tenir sur son fond pour qu'on voie où l'on clique. Il se
                  remplit d'un blanc très dilué au survol plutôt que de changer
                  de couleur : sur une photo, un aplat franc trancherait. */}
              <Link
                href="/diagnostic"
                className="group inline-flex items-center gap-2 rounded-full border border-primary-foreground/55 px-7 py-3.5 text-sm font-semibold text-primary-foreground backdrop-blur-[2px] transition hover:border-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("diagnosticCta")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Visuel de tête. `priority` : c'est le plus grand visuel au-dessus de
            la ligne de flottaison, celui que le navigateur doit chercher en
            premier. */}
        {/* FOND PLEINE LARGEUR, À TOUTES LES TAILLES.
            La photo est un panoramique 2,25:1 composé pour le rôle : le sujet
            est cadré à droite et la moitié gauche est un aplat vide, prêt à
            recevoir le titre. La ranger dans une demi-colonne aurait rogné les
            deux tiers de cette composition. Elle passe donc en fond du hero
            entier, et le texte se pose dessus — la disposition que la photo
            appelle d'elle-même.

            `object-[68%_center]` : sur un écran étroit, un cadrage centré
            couperait le visage et le flacon, qui vivent dans le tiers droit du
            fichier. Sur grand écran, le format de la section se rapproche de
            celui de la photo et le décalage n'est plus nécessaire.

            Le voile qui suit est un frère de l'image, pas un enfant : posé sur
            elle en `absolute inset-0`, il couvre exactement le même cadre à
            toutes les tailles, sans dépendre de la façon dont `object-fit`
            recadre le fichier à l'intérieur. */}
        <div
          className="kk-rise absolute inset-0"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          <Image
            src="/images/editorial/hero-serum.webp"
            alt={t("hero.imageAlt")}
            fill
            sizes="100vw"
            className="object-cover object-[68%_center] lg:object-right"
            priority
          />
          <div aria-hidden="true" className="kk-hero-voile absolute inset-0" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- 7. Rail best-sellers -- */

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-deep">{title}</h2>
      </div>
      {action && (
        <Link
          href="/soins-visage"
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-deep kk-underline"
        >
          {action}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

/**
 * Rail de produits.
 *
 * `bare` le rend sans sa propre gouttière ni ses marges verticales, pour qu'il
 * puisse tenir dans une colonne à côté des catégories — c'est la composition de
 * la maquette, et c'est ce qui permet de loger treize blocs sans doubler la
 * hauteur de la page.
 */
export function ProductRail({
  eyebrow,
  title,
  action,
  products,
  columns = 4,
  bare = false,
  carousel = false,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  products: KKProductView[];
  columns?: 2 | 4;
  bare?: boolean;
  /** Rail défilant en boucle plutôt que grille figée. Voir ProductCarousel. */
  carousel?: boolean;
}) {
  const grille =
    columns === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4";

  const contenu = (
    <>
      <SectionHead eyebrow={eyebrow} title={title} action={action} />
      {carousel ? (
        <ProductCarousel products={products} label={title} />
      ) : (
        <div className={`kk-enter-stagger grid gap-x-5 gap-y-8 ${grille}`}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );

  if (bare) {
    return <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">{contenu}</div>;
  }

  return <section className="section mx-auto max-w-7xl px-6">{contenu}</section>;
}

/* ------------------------------------------------------------ 10. Avis -- */

/* Le bloc des avis vivait ici, en deux variantes : une grille de trois cartes
   et une carte compacte. Les deux ont disparu au profit de `InsightsSection`
   (home-sections.tsx), qui réunit conseils, avant/après et avis en une seule
   section — trois cartes autonomes côte à côte se disputaient l'attention pour
   ce qui est un seul propos, la preuve.

   La règle de fond n'a pas bougé : seuls de vrais avis modérés s'affichent, et
   une liste vide masque le panneau plutôt que d'inventer un témoignage. */
