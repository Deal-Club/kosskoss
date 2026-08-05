"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import type { ProductTagRow } from "@/server/kk/product-tags";

// Vocabulaire de tags utilisé par le questionnaire (repère pour l'admin).
const VOCAB = [
  "peau_grasse", "peau_seche", "peau_mixte", "peau_normale", "peau_sensible",
  "hydratation", "imperfections", "matifiant", "eclat", "anti_age", "apaisant",
  "nettoyage", "traitement", "solaire", "protection", "budget_eco", "premium",
];

const inputCls =
  "w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function ProductTagsAdmin({ initial }: { initial: ProductTagRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ProductTagRow[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  // Regroupement univers → catégorie pour l'affichage.
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, ProductTagRow[]>>();
    for (const r of rows) {
      if (!map.has(r.group)) map.set(r.group, new Map());
      const cat = map.get(r.group)!;
      if (!cat.has(r.category)) cat.set(r.category, []);
      cat.get(r.category)!.push(r);
    }
    return map;
  }, [rows]);

  function patch(id: string, tagsText: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, tagsText } : r)));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/product-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows.map((r) => ({ id: r.id, tagsText: r.tagsText })) }),
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
          <Link href="/admin/diagnostic" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au diagnostic
          </Link>
          <h1 className="text-2xl font-black text-foreground">Tags produits</h1>
          <p className="text-sm text-muted-foreground">
            Associez chaque produit aux tags du diagnostic. Séparés par des virgules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" && <span className="text-sm text-primary">Enregistré ✓</span>}
          {status === "error" && <span className="text-sm text-destructive">Erreur</span>}
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

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Tags reconnus :</span> {VOCAB.join(" · ")}
      </div>

      {[...grouped.entries()].map(([group, cats]) => (
        <div key={group}>
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">{group}</h2>
          <div className="space-y-5">
            {[...cats.entries()].map(([category, items]) => (
              <div key={category} className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{category}</p>
                <div className="space-y-3">
                  {items.map((r) => (
                    <div key={r.id} className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {r.brand}
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                      </div>
                      <input
                        value={r.tagsText}
                        onChange={(e) => patch(r.id, e.target.value)}
                        className={inputCls}
                        placeholder="peau_grasse, imperfections, matifiant"
                        aria-label={`Tags de ${r.name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
