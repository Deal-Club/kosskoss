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
 * Vitrine d'une routine : les produits qui la composent, posés sur sa teinte.
 *
 * Les packshots sont légèrement décalés et se chevauchent, comme sur la
 * maquette : une routine est un ensemble, pas une grille de trois vignettes
 * indépendantes.
 */
function RoutineVisual({ routine }: { routine: KKRoutineView }) {
  return (
    <div className={`relative flex h-44 items-end justify-center gap-1 overflow-hidden px-4 ${tintClass(routine.tint)}`}>
      {routine.image ? (
        <Image src={routine.image} alt="" aria-hidden="true" fill sizes="320px" className="object-cover" />
      ) : (
        routine.steps.slice(0, 4).map((step, i) => (
          <div
            key={step.id}
            className="relative h-[78%] w-1/3 shrink-0"
            // Les flacons du milieu remontent : la silhouette d'ensemble est
            // alors une courbe et non un trait, ce qui se lit comme un groupe.
            style={{ marginBottom: i % 2 === 1 ? "0.9rem" : 0 }}
          >
            {step.product.image ? (
              <Image
                src={step.product.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="120px"
                className="object-contain object-bottom"
              />
            ) : (
              <BottleMotif className="absolute inset-0 m-auto h-full w-auto text-deep/25" />
            )}
          </div>
        ))
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
        <p className="mt-3 text-[0.78rem] font-medium text-deep/70">
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
