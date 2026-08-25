import Link from "next/link";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";
import type { RoutineListe } from "@/server/kk/routine-admin";

/**
 * Liste de toutes les routines (page de gestion). Chaque ligne mène à
 * l'éditeur ; un bouton crée une nouvelle routine.
 */
function Statut({ r }: { r: RoutineListe }) {
  if (!r.active) return <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">Inactive</span>;
  const couleur =
    r.servables >= 2 ? "bg-[#16a34a]" : r.servables === 1 ? "bg-[#e3a008]" : "bg-destructive";
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${couleur}`} />
      {r.servables}/{r.total} produit{r.total > 1 ? "s" : ""}
    </span>
  );
}

export function RoutinesListe({ routines }: { routines: RoutineListe[] }) {
  return (
    <div>
      <Link
        href="/admin/diagnostic"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à l&apos;arbre
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Routines</h1>
          <p className="text-sm text-muted-foreground">
            {routines.length} routine{routines.length > 1 ? "s" : ""}. Cliquez-en une pour la modifier.
          </p>
        </div>
        <Link
          href="/admin/diagnostic/routines/nouveau"
          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Créer une routine
        </Link>
      </div>

      {routines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Aucune routine. Créez-en une avec le bouton ci-dessus.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {routines.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/diagnostic/routines/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.72rem] text-muted-foreground">
                    <span className="rounded bg-sand px-1.5 py-0.5 font-semibold text-deep">{r.besoinLabel}</span>
                    <span>{r.niveauLabel}</span>
                    {r.code && <span className="font-mono">· {r.code}</span>}
                  </p>
                </div>
                <Statut r={r} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
