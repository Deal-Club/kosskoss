"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import type { ProductTagAdmin } from "@/server/kk/vocabulaire-tags";
import { FAMILLE_PEAU, FAMILLE_PREOCCUPATION } from "@/lib/kk/facettes";

const inputCls =
  "w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary";
const labelCls = "block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground";

// Suggestions dans le champ « famille » : seules « peau » et « preoccupation »
// deviennent des facettes de catalogue, mais rien n'empêche de saisir une
// autre famille (elle continuera de servir le diagnostic, hors facettes).
const FAMILLES_SUGGEREES = [FAMILLE_PEAU, FAMILLE_PREOCCUPATION, "budget", "categorie", "geste", "texture"];

export function TagVocabularyAdmin({ initial }: { initial: ProductTagAdmin[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ProductTagAdmin[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  // Regroupement par famille pour la lisibilité : c'est déjà l'ordre renvoyé
  // par lireVocabulaireAdmin (family asc, position asc).
  const grouped = useMemo(() => {
    const map = new Map<string, ProductTagAdmin[]>();
    for (const row of rows) {
      if (!map.has(row.family)) map.set(row.family, []);
      map.get(row.family)!.push(row);
    }
    return map;
  }, [rows]);

  function patch(key: string, changes: Partial<Omit<ProductTagAdmin, "key">>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/vocabulaire-tags", {
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
          <h1 className="text-2xl font-black text-foreground">Tags produits</h1>
          <p className="text-sm text-muted-foreground">
            Libellés, famille et ordre des tags — « peau » et « preoccupation » alimentent les
            filtres du catalogue dans les deux langues, sans redéploiement.
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

      <datalist id="familles-suggerees">
        {FAMILLES_SUGGEREES.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      {[...grouped.entries()].map(([family, items]) => (
        <div key={family} className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Famille : {family}
          </p>
          <div className="space-y-3">
            {items.map((row) => (
              <div
                key={row.key}
                className="grid gap-2 rounded border border-border/70 bg-background/50 p-3 sm:grid-cols-[10rem_1fr_1fr_9rem_5rem_4.5rem] sm:items-end"
              >
                <div>
                  <span className={labelCls}>Clé</span>
                  {/* Lecture seule : la clé est écrite telle quelle dans Product.tags
                      et dans les pondérations du diagnostic. La modifier depuis cet
                      écran orphelinerait tout ce qui la référence déjà. */}
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
                  <span className={labelCls}>Famille</span>
                  <input
                    value={row.family}
                    onChange={(e) => patch(row.key, { family: e.target.value })}
                    list="familles-suggerees"
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
      ))}
    </div>
  );
}
