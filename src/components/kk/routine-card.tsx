import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LocalizedLink as Link } from "./localized-link";
import { ArrowRight } from "lucide-react";
import { RoutineIllustration } from "./routine-illustration";
import { RoutineAddToCart } from "./routine-add";
import { formatFcfa } from "@/lib/kk/format";
import type { KKRoutineView } from "@/types/kk";

/** Tronque un texte à `max` mots (ajoute « … » si coupé). */
function tronquerMots(texte: string, max: number): string {
  const mots = texte.trim().split(/\s+/).filter(Boolean);
  return mots.length <= max ? texte.trim() : mots.slice(0, max).join(" ") + "…";
}

/**
 * Teintes de routine.
 *
 * La table est explicite parce que Tailwind lit les classes à la compilation :
 * une classe composée à l'exécution (`bg-tint-${tint}`) ne serait jamais
 * générée. Les jetons sont définis dans globals.css.
 *
 * C'est ce dispositif qui répond au « design global un peu trop monochrome » du
 * retour client : sur la maquette, les cinq routines portent cinq fonds pastel
 * distincts. La couleur y est fonctionnelle — elle identifie la routine, sur
 * l'accueil comme sur sa page — et non décorative.
 */
const TINTS: Record<string, string> = {
  acne: "bg-tint-acne",
  taches: "bg-tint-taches",
  eclat: "bg-tint-eclat",
  age: "bg-tint-age",
  hydratation: "bg-tint-hydratation",
};

export function tintClass(tint: string): string {
  return TINTS[tint] ?? TINTS.acne;
}

/** Jetons connus, pour retomber sur `acne` comme `tintClass`. */
const TINT_KEYS = new Set(Object.keys(TINTS));

/**
 * La couleur de la teinte, comme valeur CSS brute plutôt que classe Tailwind —
 * pour un dégradé en style inline (`background: linear-gradient(…, var(...))`),
 * où une classe `bg-tint-*` ne peut pas s'employer.
 */
export function tintCssVar(tint: string): string {
  return `var(--tint-${TINT_KEYS.has(tint) ? tint : "acne"})`;
}

/**
 * Vitrine d'une routine : un seul visuel, posé sur sa teinte.
 *
 * La version précédente alignait les trois ou quatre packshots de la routine
 * côte à côte. À 270 px de large, chaque flacon tombait sous les 90 px : on ne
 * reconnaissait plus aucun produit et la vignette se lisait comme un
 * encombrement. Retour client explicite là-dessus — un seul produit, présenté
 * en grand. La composition de la routine reste dite juste en dessous, par la
 * suite des gestes (« Nettoyer · Traiter · Protéger »), qui est de toute façon
 * l'information utile : c'est un ordre qu'on achète, pas un lot de flacons.
 */
function RoutineVisual({ routine }: { routine: KKRoutineView }) {
  return (
    <div className={`relative flex h-44 items-center justify-center overflow-hidden ${tintClass(routine.tint)}`}>
      {routine.image ? (
        // Visuel éditorial propre à la routine : il occupe tout le cadre.
        // `kk-zoom` + variante `group-hover` : il grossit de 6 % au survol de
        // la carte. Le cadre est en `overflow-hidden`, rien ne déborde ; la
        // durée est plus longue que celle du soulèvement (600 ms contre 400)
        // pour que l'image continue son mouvement après que la carte s'est
        // posée — c'est ce décalage qui donne l'impression de profondeur.
        <Image
          src={routine.image}
          alt=""
          aria-hidden="true"
          fill
          sizes="320px"
          className="kk-zoom object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
        />
      ) : (
        // Nature morte vectorielle propre à la routine (retour client) : elle
        // montre un ENSEMBLE de contenants — une routine est une suite de
        // gestes, pas un produit — et se décline par la couleur d'une carte à
        // l'autre. Elle s'efface dès qu'une vraie image de coffret est
        // renseignée sur `Routine.image`.
        // Elle suit le même mouvement que le visuel éditorial : sans lui, les
        // routines sans image seraient les seules cartes inertes de la rangée,
        // et l'effet paraîtrait cassé une carte sur deux.
        <RoutineIllustration
          tint={routine.tint}
          className="kk-zoom absolute inset-0 h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
        />
      )}
    </div>
  );
}

/**
 * Carte de routine — l'unité de l'« achat rapide » du bloc 5 de la maquette.
 *
 * Elle porte tout ce qu'il faut pour décider : le besoin traité, la suite des
 * gestes, le prix d'entrée, et l'ajout au panier sans passer par une page
 * intermédiaire.
 */
export async function RoutineCard({ routine }: { routine: KKRoutineView }) {
  const t = await getTranslations("routine");
  return (
    /* `group` : c'est la CARTE ENTIÈRE qui est survolée, pas chacun de ses
       morceaux. Sans elle, le visuel ne grossirait qu'au passage sur le visuel
       lui-même, et l'effet se déclencherait par bouts selon l'endroit où la
       souris entre.

       `kk-lift-fort` s'ajoute à `kk-lift` (voir globals.css) : soulèvement
       doublé, ombre creusée, filet qui vire au laiton. Les cartes de routine
       sont les seules vignettes de l'accueil dont le clic engage un achat ;
       elles peuvent répondre plus franchement que les autres. */
    <article className="kk-lift kk-lift-fort group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Link href={routine.href} className="block" tabIndex={-1} aria-hidden="true">
        <RoutineVisual routine={routine} />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {/* Le titre suit le survol de la carte et non le sien : il passe au
            laiton d'encre, la même teinte que prend le filet. Deux signaux
            d'une seule couleur valent mieux que deux effets sans rapport. */}
        <h3 className="leading-snug">
          <Link
            href={routine.href}
            className="text-deep transition-colors duration-300 group-hover:text-gold-ink hover:text-gold-ink"
          >
            {routine.name}
          </Link>
        </h3>

        {routine.claim && (
          <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
            {tronquerMots(routine.claim, 15)}
          </p>
        )}

        {/* Prix d'entrée, remis à la demande du client : « à partir de », car
            le total dépend des produits réellement servables de la routine. */}
        <p className="figure mt-2 text-sm font-semibold text-deep">
          {t("priceFrom", { value: formatFcfa(routine.totalFcfa) })}
        </p>

        {/* LA SUITE DES GESTES ET LE PRIX D'ENTRÉE ONT ÉTÉ RETIRÉS DE LA CARTE.
            Ils y tenaient deux lignes — « Nettoyer · Traiter · Hydrater », puis
            « À partir de 51 500 FCFA » — au-dessus des commandes. La vignette
            portait ainsi cinq niveaux d'information pour un objet qu'on
            parcourt du regard ; le nom et l'accroche disent le besoin traité,
            c'est ce sur quoi le clic se décide. Le détail des gestes et le prix
            restent sur la page de la routine, où l'on va justement pour cela.
            `routine.steps` et `routine.totalFcfa` continuent d'être servis par
            la vue : rien n'a bougé côté données, seul l'affichage change. */}

        {/* `mt-auto` : les boutons s'alignent d'une carte à l'autre, quelle que
            soit la longueur des accroches au-dessus. */}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* `mode="achat"` : depuis une vignette, le bouton mène au tunnel
                plutôt que de déposer la routine et de laisser le visiteur
                chercher son panier. */}
            <RoutineAddToCart routine={routine} mode="achat" />
            <Link
              href={routine.href}
              className="group inline-flex items-center gap-1 text-sm font-medium text-deep kk-underline"
            >
              {t("detailLink")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
