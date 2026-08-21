"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import type { GesteLigne } from "@/lib/kk/gestes-selection";

const inputCls =
  "w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary";
const labelCls = "block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground";

export function DiagStepsAdmin({ initial }: { initial: GesteLigne[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<GesteLigne[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  // Tri par position pour l'affichage : c'est déjà l'ordre renvoyé par
  // lireGestes, mais un changement de position dans l'écran doit se refléter
  // immédiatement sans attendre l'enregistrement.
  const sorted = useMemo(() => [...rows].sort((a, b) => a.position - b.position), [rows]);

  // C'est le lien que le critère 08 demande de rendre visible : le nombre de
  // produits que le diagnostic proposera est exactement le nombre de gestes
  // actifs (buildRoutine lit gestesActifs, un produit par geste).
  const actifs = useMemo(() => rows.filter((r) => r.active).length, [rows]);

  function patch(key: string, changes: Partial<Omit<GesteLigne, "key">>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/diagnostic-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows }),
      });
      if (!res.ok) setStatus("error");
      else {
        setStatus("saved");
        router.refresh();
      }
    } catch {
      setStatus("error");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gestes du diagnostic</h1>
          <p className="text-sm text-muted-foreground">
            Libellés, catégorie source, ordre et activation des gestes proposés par le
            Diagnostic Beauté — dans les deux langues, sans redéploiement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" && <span className="text-sm text-primary">Enregistré ✓</span>}
          {status === "error" && <span className="text-sm text-destructive">Erreur d&rsquo;enregistrement</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="space-y-3">
          {sorted.map((row) => (
            <div
              key={row.key}
              className="grid gap-2 rounded border border-border/70 bg-background/50 p-3 sm:grid-cols-[10rem_1fr_1fr_9rem_5rem_4.5rem] sm:items-end"
            >
              <div>
                <span className={labelCls}>Clé</span>
                {/* Lecture seule : la clé est la clé primaire et la référence
                    stable que le moteur de routine utilise. La modifier depuis
                    cet écran créerait une ligne orpheline plutôt que de
                    renommer quoi que ce soit. */}
                <p
                  className="truncate rounded border border-transparent bg-muted px-2.5 py-1.5 text-sm text-muted-foreground"
                  title={row.key}
                >
                  {row.key}
                </p>
              </div>
              <label>
                <span className={labelCls}>Libellé FR</span>
                <input
                  value={row.labelFr}
                  onChange={(e) => patch(row.key, { labelFr: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label>
                <span className={labelCls}>Libellé EN</span>
                <input
                  value={row.labelEn}
                  onChange={(e) => patch(row.key, { labelEn: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label>
                <span className={labelCls}>Catégorie</span>
                <input
                  value={row.category}
                  onChange={(e) => patch(row.key, { category: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label>
                <span className={labelCls}>Position</span>
                <input
                  type="number"
                  value={row.position}
                  onChange={(e) => patch(row.key, { position: Number(e.target.value) })}
                  className={inputCls}
                />
              </label>
              <label className="flex items-center gap-1.5 pb-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(e) => patch(row.key, { active: e.target.checked })}
                />
                Actif
              </label>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <strong className="font-bold text-foreground">{actifs}</strong> geste
        {actifs > 1 ? "s" : ""} actif{actifs > 1 ? "s" : ""} — le diagnostic proposera
        {actifs > 1 ? " autant de produits" : " un produit"} à l&rsquo;issue du parcours.
      </p>
    </div>
  );
}
