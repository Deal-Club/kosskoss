import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import type { KKProductView } from "@/types/kk";
import { ProductCard } from "./product-card";

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
 *  — LE FOND EST UN APLAT TAUPE, pas le crème de la page. Sur la maquette, le
 *    hero est le premier des trois registres de fond (taupe, crème, vert
 *    profond) qui donnent son rythme à la page. L'accueil précédent n'en avait
 *    que deux.
 *
 *  — L'IMAGE VA JUSQU'AU BORD. Elle sortait d'un cadre arrondi flottant au
 *    milieu du crème ; elle occupe désormais toute la moitié droite, comme sur
 *    la maquette, ce qui lui donne le poids qu'un visuel de tête doit avoir.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-taupe">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-4">
        <div className="max-w-xl px-6 pb-4 pt-12 lg:py-20">
          <p className="eyebrow kk-rise flex items-center gap-2" style={{ "--d": "0ms" } as React.CSSProperties}>
            <span className="h-px w-8 bg-gold" /> L&rsquo;expertise dédiée à votre peau
          </p>

          <h1 className="kk-rise mt-5 text-deep" style={{ "--d": "80ms" } as React.CSSProperties}>
            Des soins conçus pour sublimer{" "}
            <span className="title-soft">les peaux noires &amp; métissées</span>
          </h1>

          <p
            className="lead kk-rise mt-5 max-w-md text-deep/75"
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
            <Link
              href="/soins-visage"
              className="kk-fill group inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-taupe"
            >
              Découvrir la boutique
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/routines"
              className="inline-flex items-center gap-2 rounded-full border border-deep/30 px-7 py-3.5 text-sm font-semibold text-deep transition hover:border-deep hover:bg-deep/5"
            >
              Trouvez votre routine
              <Sparkles className="h-4 w-4 text-gold" />
            </Link>
          </div>
        </div>

        {/* Visuel de tête. `priority` : c'est le plus grand visuel au-dessus de
            la ligne de flottaison, celui que le navigateur doit chercher en
            premier. */}
        <div className="kk-rise relative h-[22rem] w-full sm:h-[28rem] lg:h-[34rem]" style={{ "--d": "200ms" } as React.CSSProperties}>
          <Image
            src="/images/editorial/hero-soin.webp"
            alt="Application d'un sérum du bout des doigts sur une peau riche en mélanine"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {/* Fondu vers le taupe sur le bord gauche : la photo se raccorde à
              l'aplat au lieu de s'arrêter net contre le texte. Masqué sous `lg`,
              où l'image passe sous le texte et n'a plus de bord à raccorder. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 hidden w-32 bg-gradient-to-r from-taupe to-transparent lg:block"
          />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- 7. Rail best-sellers -- */

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
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
}: {
  eyebrow: string;
  title: string;
  action?: string;
  products: KKProductView[];
  columns?: 2 | 4;
  bare?: boolean;
}) {
  const grille =
    columns === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4";

  const contenu = (
    <>
      <SectionHead eyebrow={eyebrow} title={title} action={action} />
      <div className={`kk-enter-stagger grid gap-x-5 gap-y-8 ${grille}`}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );

  if (bare) {
    return <div className="rounded-2xl border border-border/70 bg-card p-6">{contenu}</div>;
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
