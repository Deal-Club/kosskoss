import Link from "next/link";
import { ChevronRight, AlertTriangle, ShieldCheck, SlidersHorizontal, Pencil } from "lucide-react";
import type {
  ArbreDiagnostic as ArbreData,
  ArbreBranche,
  ArbreRoutine,
  StatutRoutine,
} from "@/server/kk/arbre-diagnostic";

/**
 * Vue « Arbre du diagnostic » (lecture) : pour chaque réponse à la question de
 * priorité, le besoin désigné et les routines (Essentielle / Premium) qui en
 * sortent, avec un voyant de santé par routine. L'édition inline viendra dans
 * un second temps ; ici on rend l'arbre visible et lisible d'un coup d'œil.
 */

const STATUT_STYLE: Record<StatutRoutine, { point: string; libelle: string; texte: string }> = {
  complete: { point: "bg-[#16a34a]", libelle: "Complète", texte: "text-[#16a34a]" },
  incomplete: { point: "bg-[#e3a008]", libelle: "Incomplète", texte: "text-[#e3a008]" },
  vide: { point: "bg-destructive", libelle: "Vide", texte: "text-destructive" },
};

function Fleche() {
  return <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted-foreground lg:block" aria-hidden />;
}

function CarteRoutine({ routine }: { routine: ArbreRoutine }) {
  const s = STATUT_STYLE[routine.statut];
  const contenu = (
    <>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.point}`} aria-hidden />
        <span className="text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground">
          {routine.niveau}
        </span>
        <span className={`ml-auto text-[0.7rem] font-semibold ${s.texte}`}>{s.libelle}</span>
        {routine.id && <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />}
      </div>
      <p className="text-sm font-semibold text-foreground">
        {routine.nom ?? <span className="text-destructive">Aucune routine ({routine.code})</span>}
      </p>
      {routine.nom && (
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {routine.code} · {routine.servables} produit{routine.servables > 1 ? "s" : ""} servable
          {routine.servables > 1 ? "s" : ""}
        </p>
      )}
      {routine.produits.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {routine.produits.map((p, i) => (
            <li
              key={`${p.nom}-${i}`}
              className={`rounded-full px-2 py-0.5 text-[0.7rem] ${
                p.servable
                  ? "bg-sand text-deep"
                  : "bg-muted text-muted-foreground line-through decoration-destructive/70"
              }`}
              title={p.servable ? undefined : "Produit inactif ou en rupture — ignoré"}
            >
              {p.nom}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const classe = "block rounded-xl border border-border bg-white p-3 text-left";
  if (routine.id) {
    return (
      <Link
        href={`/admin/diagnostic/routines/${routine.id}`}
        className={`group ${classe} transition hover:border-primary hover:shadow-sm`}
        title="Modifier cette routine"
      >
        {contenu}
      </Link>
    );
  }
  return <div className={classe}>{contenu}</div>;
}

function Branche({ branche }: { branche: ArbreBranche }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="grid items-center gap-3 lg:grid-cols-[minmax(11rem,15rem)_auto_minmax(9rem,12rem)_auto_minmax(0,1fr)]">
        {/* Réponse */}
        <div className="rounded-xl border border-deep/15 bg-white p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">Réponse</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{branche.reponseLabel}</p>
        </div>

        <Fleche />

        {/* Besoin */}
        {branche.besoin ? (
          <div className="rounded-xl bg-deep px-3 py-2.5 text-center">
            <p className="text-[0.6rem] font-bold uppercase tracking-wide text-primary-foreground/70">Besoin</p>
            <p className="text-sm font-bold text-primary-foreground">{branche.besoinLabel}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs font-semibold">Aucun besoin — réponse ignorée par le moteur</p>
          </div>
        )}

        <Fleche />

        {/* Routines */}
        {branche.routines.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {branche.routines.map((r) => (
              <CarteRoutine key={r.niveau} routine={r} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>
    </li>
  );
}

export function ArbreDiagnostic({ data }: { data: ArbreData }) {
  const toutesRoutines = [...data.branches.flatMap((b) => b.routines), ...data.securite.routines];
  const completes = toutesRoutines.filter((r) => r.statut === "complete").length;
  const aCorriger = toutesRoutines.filter((r) => r.statut !== "complete").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Arbre du diagnostic</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pour chaque réponse à la question de priorité, le besoin désigné et les routines
            proposées. <strong className="text-foreground">Cliquez une routine</strong> pour éditer
            ses produits. Une routine ne s&apos;affiche au client que si elle a au moins 2 produits
            actifs et en stock.
          </p>
        </div>
        <Link
          href="/admin/diagnostic/questions"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
        >
          <SlidersHorizontal className="h-4 w-4" /> Modifier les questions
        </Link>
      </div>

      {/* Légende + résumé */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs">
        {(["complete", "incomplete", "vide"] as StatutRoutine[]).map((st) => (
          <span key={st} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUT_STYLE[st].point}`} />
            {STATUT_STYLE[st].libelle}
          </span>
        ))}
        <span className="ml-auto font-semibold text-foreground">
          {completes} routine{completes > 1 ? "s" : ""} complète{completes > 1 ? "s" : ""} ·{" "}
          <span className={aCorriger > 0 ? "text-destructive" : ""}>{aCorriger} à corriger</span>
        </span>
      </div>

      {!data.questionExiste ? (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            La question de priorité (clé <code className="font-mono">priorite</code>) est introuvable :
            l&apos;arbre ne peut pas se construire. Vérifiez le questionnaire.
          </p>
        </div>
      ) : (
        <>
          {data.questionTitre && (
            <p className="mb-3 text-sm font-semibold text-foreground">
              Question : « {data.questionTitre} »
            </p>
          )}
          <ul className="space-y-3">
            {data.branches.map((b) => (
              <Branche key={b.reponseId} branche={b} />
            ))}
          </ul>

          {/* Règle de sécurité Q3 */}
          <div className="mt-6 rounded-2xl border border-deep/20 bg-sand/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-deep">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">
                Règle spéciale — si « peau réactive » (Q3) → Besoin : {data.securite.besoinLabel}
              </p>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Cette réponse l&apos;emporte sur la priorité déclarée : quelle que soit la réponse Q2,
              une peau réactive reçoit la routine barrière.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
              {data.securite.routines.map((r) => (
                <CarteRoutine key={r.niveau} routine={r} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
