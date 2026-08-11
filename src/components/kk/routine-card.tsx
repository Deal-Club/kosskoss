import Image from "next/image";
import { LocalizedLink as Link } from "./localized-link";
import { ArrowRight } from "lucide-react";
import { formatFcfa } from "@/lib/kk/format";
import { BottleMotif } from "./motifs";
import { RoutineAddToCart } from "./routine-add";
import type { KKRoutineView } from "@/types/kk";

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
        <Image src={routine.image} alt="" aria-hidden="true" fill sizes="320px" className="object-cover" />
      ) : (
        // En attendant les visuels de coffret fournis par le client.
        //
        // La carte affichait ici le packshot du premier produit de la routine.
        // C'était trompeur : un flacon isolé se lit comme LE produit vendu,
        // alors qu'une routine est un ensemble de trois à cinq gestes. Le
        // visiteur croyait acheter ce qu'il voyait.
        //
        // Le motif sur l'aplat teinté ne prétend rien : il tient la place,
        // porte la couleur de la routine, et s'efface dès qu'une vraie image
        // de coffret est renseignée sur `Routine.image`.
        <BottleMotif className="h-[78%] w-auto text-deep/25" />
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
export function RoutineCard({ routine }: { routine: KKRoutineView }) {
  return (
    <article className="kk-lift flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Link href={routine.href} className="block" tabIndex={-1} aria-hidden="true">
        <RoutineVisual routine={routine} />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="leading-snug">
          <Link href={routine.href} className="text-deep transition hover:text-deep/70">
            {routine.name}
          </Link>
        </h3>

        {routine.claim && (
          <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{routine.claim}</p>
        )}

        {/* La suite des gestes : « Nettoyer • Traiter • Protéger ». C'est ce qui
            distingue une routine d'un lot de produits — on achète un ordre. */}
        <p className="mt-3 text-[0.78rem] font-medium text-deep">
          {routine.steps.map((s) => s.label).join(" · ")}
        </p>

        {/* `mt-auto` : les prix et les boutons s'alignent d'une carte à l'autre,
            quelle que soit la longueur des accroches au-dessus. */}
        <div className="mt-auto pt-4">
          <p className="text-xs text-muted-foreground">
            À partir de{" "}
            <span className="figure text-[0.95rem] font-semibold text-deep">
              {formatFcfa(routine.totalFcfa)}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <RoutineAddToCart routine={routine} />
            <Link
              href={routine.href}
              className="group inline-flex items-center gap-1 text-sm font-medium text-deep kk-underline"
            >
              Détail
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
