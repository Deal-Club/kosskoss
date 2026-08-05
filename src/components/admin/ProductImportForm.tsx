"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  label: string;
}

interface ImportRowResult {
  line: number;
  ok: boolean;
  errors: string[];
  values: {
    categoryId?: string;
    brand?: string;
    name?: string;
    price?: string;
    stock?: number;
  };
  created: boolean;
  id?: string;
}

interface ImportReport {
  format: "csv" | "json";
  dryRun: boolean;
  total: number;
  valid: number;
  invalid: number;
  created: number;
  rows: ImportRowResult[];
}

type FormatChoice = "auto" | "csv" | "json";

const CSV_HEADER =
  "categoryId;brand;name;price;oldPrice;badge;bullets;shortDescription;stock";

/** Lignes d'exemple avec une catégorie réellement existante, pour que l'import fonctionne du premier coup. */
function buildExample(categoryId: string): string {
  return [
    CSV_HEADER,
    `${categoryId};MLC Bois;Hêtre 33 cm — palette 2 MAP;649,00 €;799,00 €;-18%;Humidité < 18 %|Séché en séchoir|Fendu prêt à brûler;Palette de hêtre séché en séchoir, livrée avec son relevé de mesure.;12`,
    `${categoryId};MLC Bois;Chêne 50 cm — vrac 3 MAP;579,00 €;;Nouveau;Braises longue durée|Humidité < 18 %|Livré en vrac;Chêne séché en séchoir pour poêle de masse et feu continu.;6`,
  ].join("\n");
}

const buttonBase = "rounded-sm px-4 py-2 text-sm font-bold disabled:opacity-60";

export function ProductImportForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<FormatChoice>("auto");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const exampleCategoryId = categories[0]?.id ?? "haushalt/waschmaschinen";

  async function run(dryRun: boolean) {
    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        format: format === "auto" ? undefined : format,
        dryRun,
      }),
    });

    setPending(false);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setReport(null);
      setError(data?.error ?? "L'import a échoué.");
      return;
    }

    setReport(data as ImportReport);
    if (!dryRun) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as FormatChoice)}
            className="rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="auto">Détection automatique</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setText(buildExample(exampleCategoryId));
            setReport(null);
            setError(null);
          }}
          className={`${buttonBase} border border-border bg-white text-foreground hover:border-primary`}
        >
          Charger un exemple
        </button>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">
          Coller le CSV ou le JSON ici
        </span>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setReport(null);
          }}
          rows={12}
          spellCheck={false}
          placeholder={CSV_HEADER}
          className="w-full rounded-sm border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary"
        />
      </label>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || text.trim().length === 0}
          onClick={() => run(true)}
          className={`${buttonBase} bg-secondary text-secondary-foreground hover:brightness-125`}
        >
          {pending ? "Veuillez patienter…" : "Vérifier l'aperçu"}
        </button>
        <button
          type="button"
          disabled={pending || !report || !report.dryRun || report.valid === 0}
          onClick={() => run(false)}
          className={`${buttonBase} bg-primary text-primary-foreground hover:brightness-110`}
        >
          {report && report.dryRun && report.valid > 0
            ? `Importer ${report.valid} produits`
            : "Lancer l'import"}
        </button>
        <span className="text-xs text-muted-foreground">
          L&apos;aperçu vérifie chaque ligne sans rien enregistrer.
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-sm border border-destructive px-3 py-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {report && (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="font-black text-foreground">
              {report.dryRun ? "Aperçu" : "Import terminé"}
            </span>
            <span className="text-muted-foreground">
              Format : {report.format.toUpperCase()} · {report.total} lignes · {report.valid} valides
              · {report.invalid} en erreur
              {!report.dryRun && ` · ${report.created} créés`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">Ligne</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Marque</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Prix</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Remarques</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.line} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{row.line}</td>
                    <td className="px-3 py-2">
                      {row.created ? (
                        <span className="rounded-sm bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                          Créé
                        </span>
                      ) : row.ok ? (
                        <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                          Prêt
                        </span>
                      ) : (
                        <span className="rounded-sm bg-destructive px-2 py-1 text-xs font-bold text-white">
                          Erreur
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.values.categoryId ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.values.brand ?? "—"}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">
                      {row.values.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.values.price ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.values.stock ?? "par défaut"}
                    </td>
                    <td className="px-3 py-2 text-destructive">
                      {row.errors.length > 0 ? row.errors.join(" ") : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
