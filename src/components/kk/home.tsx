import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
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
 *  — LE FOND EST LE VERT PROFOND DE LA MARQUE. Il a d'abord été taupe, puis
 *    basculé sur `--deep` à la demande du client. Ce fond commande tout le
 *    reste du bloc : titre et chapô en clair, sur-titre en laiton clair, et
 *    surtout INVERSION DU BOUTON PRINCIPAL — un bouton `bg-deep` sur un fond
 *    `bg-deep` ne serait plus qu'un texte. Il passe au laiton, comme tous les
 *    boutons d'action posés sur du sombre ailleurs sur le site.
 *
 *  — L'IMAGE VA JUSQU'AU BORD. Elle sortait d'un cadre arrondi flottant au
 *    milieu du crème ; elle occupe désormais toute la moitié droite, comme sur
 *    la maquette, ce qui lui donne le poids qu'un visuel de tête doit avoir.
 */
export function Hero() {
  return (
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
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-x-0">
        {/* SUR MOBILE, CE BLOC EST POSÉ SUR LA PHOTO.
            La photo passe en fond absolu sous `lg` (voir plus bas) : le texte
            doit donc porter un `z-10`, sans quoi l'image — qui le suit dans le
            DOM — lui passerait devant.
            Le `pt` démesuré réserve la moitié haute du cadre au visuel : c'est
            lui qui donne au hero sa composition mobile, photo en haut, texte
            en bas sur le dégradé. Il retombe au padding normal dès `lg`, où
            les deux occupent chacun leur colonne. */}
        <div className="relative z-10 w-full lg:max-w-[44rem] lg:justify-self-end">
          <div className="max-w-xl px-6 pb-10 pt-56 sm:pt-72 lg:py-20 lg:pt-20">
            <p className="eyebrow eyebrow-on-dark kk-rise flex items-center gap-2" style={{ "--d": "0ms" } as React.CSSProperties}>
              <span className="h-px w-8 bg-gold" /> L&rsquo;expertise dédiée à votre peau
            </p>

            {/* Titre en clair sur le vert profond : 14:1 pour le premier membre,
                15:1 pour le second, en blanc pur comme demandé. Le fond sombre
                est ce qui rend ce blanc tenable — sur le taupe d'avant, il ne
                tenait que 1,5:1. */}
            <h1 className="kk-rise mt-5 text-primary-foreground" style={{ "--d": "80ms" } as React.CSSProperties}>
              Des soins conçus pour sublimer{" "}
              <span className="title-soft text-white">les peaux noires &amp; métissées</span>
            </h1>

            <p
              className="lead kk-rise mt-5 max-w-md text-primary-foreground"
              style={{ "--d": "160ms" } as React.CSSProperties}
            >
              Sélection rigoureuse, formules efficaces, résultats visibles. Et des routines déjà
              composées, pour ne pas avoir à choisir seul.
            </p>

            {/* Deux portes, dans l'ordre de la maquette : la boutique pour qui
                sait ce qu'il veut, la routine pour qui ne le sait pas. */}
            <div
              className="kk-rise mt-8 flex flex-wrap items-center gap-4"
              style={{ "--d": "240ms" } as React.CSSProperties}
            >
              {/* Bouton d'action en laiton plein, comme « Commencer le
                  diagnostic » sur l'autre section sombre du site. Il se
                  remplit de vert profond au survol (`kk-fill-deep`), ce qui
                  était l'effet inverse tant que le bouton était vert. */}
              <Link
                href="/soins-visage"
                className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-deep"
              >
                Découvrir la boutique
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {/* Contour à 50 % : 4,4:1 sur le vert profond, bien au-dessus des
                  3:1 qu'un contrôle doit tenir pour qu'on voie où l'on clique. */}
              <Link
                href="/routines"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/50 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:border-primary-foreground hover:bg-primary-foreground/10"
              >
                Trouvez votre routine
                <Sparkles className="h-4 w-4 text-gold-soft" />
              </Link>
            </div>
          </div>
        </div>

        {/* Visuel de tête. `priority` : c'est le plus grand visuel au-dessus de
            la ligne de flottaison, celui que le navigateur doit chercher en
            premier. */}
        {/* `kk-hero-fade` : le fondu du bord gauche vers le fond du hero, défini
            dans globals.css. C'est un masque appliqué à l'image, pas un voile
            posé dessus — voir le commentaire de la règle pour le pourquoi.

            HAUTEUR : `self-stretch` et non une hauteur fixe. La colonne portait
            `lg:h-[34rem]` pendant que la colonne de texte, elle, se dimensionne
            sur son contenu. Dès que le texte dépassait 34rem — ce qui est arrivé
            en agrandissant le h1 — la ligne prenait la hauteur du texte et
            l'image, centrée, laissait une bande de fond nu au-dessus et en
            dessous. Elle épouse maintenant la hauteur de la ligne, quelle que
            soit la longueur du titre ; `min-h` ne sert plus qu'à garantir une
            présence minimale si le texte devenait très court. */}
        {/* MOBILE : fond plein cadre, sous le texte.
            L'image était rangée sous le bloc de texte, ce qui donnait au
            premier écran un grand aplat vert sans visuel — le hero ne montrait
            rien avant qu'on ait fait défiler. En passant en `absolute inset-0`,
            elle occupe tout le cadre, le texte se pose dessus, et le hero perd
            au passage les 350 px que la photo occupait pour elle seule.
            Le voile (`kk-hero-voile`) porte la lisibilité du texte ; il ne
            s'applique que sous `lg`.

            DESKTOP : `lg:relative` lui rend sa place dans la grille, et rien
            ne change de la composition en deux colonnes. */}
        <div
          className="kk-rise kk-hero-fade absolute inset-0 w-full lg:relative lg:h-auto lg:min-h-[34rem] lg:self-stretch"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          <Image
            src="/images/editorial/hero-soin.webp"
            alt="Application d'un sérum du bout des doigts sur une peau riche en mélanine"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-[60%_center] lg:object-center"
            priority
          />
          {/* `object-[60%_center]` : cadré à 100 % de largeur sur un téléphone,
              le sujet — le visage et la main — se trouve à droite du fichier.
              Un recadrage centré coupait la moitié du geste. */}
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
