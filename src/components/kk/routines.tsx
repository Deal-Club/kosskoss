import { LocalizedLink as Link } from "./localized-link";
import { ArrowRight } from "lucide-react";
import { RoutineCard } from "./routine-card";
import type { KKRoutineView } from "@/types/kk";

/**
 * Bloc « Achat rapide : nos routines prêtes à l'emploi ».
 *
 * C'est le bloc 5 de la structure fournie par le client (colonne « STRUCTURE DU
 * SITE » de la maquette « Toutes pages ») : routines prêtes · par préoccupation
 * · ajout direct au panier. Il se place avant les catégories et les
 * best-sellers, conformément au plan — les modules « solution » passent devant
 * les modules « produit ».
 *
 * Défilement horizontal jusqu'à `lg`, où les cinq cartes tiennent en ligne.
 * La charte pose le mobile-first : sur un écran étroit, cinq cartes empilées
 * feraient à elles seules la hauteur de la page.
 */
export function RoutinesRail({ routines }: { routines: KKRoutineView[] }) {
  if (routines.length === 0) return null;

  return (
    <section className="section mx-auto max-w-7xl px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Achat rapide</p>
          <h2 className="mt-2 text-deep">Nos routines prêtes à l&rsquo;emploi</h2>
          <p className="lead mt-2 max-w-xl">
            Une préoccupation, trois gestes dans le bon ordre, un seul ajout au panier.
          </p>
        </div>
        <Link
          href="/routines"
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-deep kk-underline"
        >
          Voir toutes les routines
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Rangée défilante en dessous de `lg`.

          `snap-x` cale chaque carte sur le bord gauche : on ne s'arrête jamais
          entre deux cartes. Les marges négatives font courir la piste jusqu'aux
          bords de l'écran alors que la section reste dans sa gouttière — sans
          quoi la carte suivante semble coupée par une marge et non par le bord,
          et rien n'indique qu'on peut faire défiler. */}
      <div className="-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
        {routines.map((routine) => (
          <div
            key={routine.id}
            className="w-[17rem] shrink-0 snap-start lg:w-auto lg:shrink"
          >
            <RoutineCard routine={routine} />
          </div>
        ))}
      </div>
    </section>
  );
}
