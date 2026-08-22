"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompteRenduImport } from "@/server/kk/marques";

/**
 * Le bouton d'import lit les marques distinctes des produits, crée celles qui
 * manquent, et rattache les produits dont `brandId` est vide. Idempotent :
 * relancé, il ne crée plus rien. Le compte rendu est affiché en clair — un
 * import muet ne se vérifie pas, et celui-ci modifie le catalogue.
 */
export function BrandImportButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rapport, setRapport] = useState<CompteRenduImport | null>(null);

  async function lancer() {
    setPending(true);
    setError(null);
    setRapport(null);

    const response = await fetch("/api/admin/brands/import", { method: "POST" });
    const data = await response.json().catch(() => null);

    setPending(false);
    if (!response.ok) {
      setError((data as { error?: string } | null)?.error ?? "L'import a échoué.");
      return;
    }

    setRapport(data as CompteRenduImport);
    router.refresh();
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={lancer}
        disabled={pending}
        className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary disabled:opacity-60"
      >
        {pending ? "Import en cours…" : "Importer les marques du catalogue"}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Crée les marques manquantes à partir des fiches produit et rattache les produits dont la
        marque n&apos;est pas encore reliée. Peut être relancé sans risque.
      </p>

      {error ? (
        <p className="mt-3 rounded-sm border border-destructive bg-white px-3 py-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {rapport ? (
        <div className="mt-3 rounded-sm border border-border bg-muted p-4 text-sm">
          <p className="mb-2 font-black text-foreground">Compte rendu de l&apos;import</p>

          <ul className="mb-2 list-inside list-disc space-y-1 text-foreground">
            <li>
              {rapport.produitsRattaches} produit{rapport.produitsRattaches > 1 ? "s" : ""} rattaché
              {rapport.produitsRattaches > 1 ? "s" : ""}
            </li>
            <li>
              {rapport.produitsDejaRattaches} produit{rapport.produitsDejaRattaches > 1 ? "s" : ""} déjà
              rattaché{rapport.produitsDejaRattaches > 1 ? "s" : ""}
            </li>
          </ul>

          {rapport.creees.length > 0 ? (
            <div className="mb-2">
              <p className="font-semibold text-foreground">
                Marques créées ({rapport.creees.length})
              </p>
              <p className="text-muted-foreground">{rapport.creees.join(", ")}</p>
            </div>
          ) : (
            <p className="mb-2 text-muted-foreground">Aucune marque créée.</p>
          )}

          {rapport.fusionnees.length > 0 ? (
            <div>
              <p className="font-semibold text-foreground">Écritures fondues ensemble</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {rapport.fusionnees.map((fusion) => (
                  <li key={fusion.conservee}>
                    <span className="font-semibold text-foreground">{fusion.conservee}</span> ←{" "}
                    {fusion.variantes.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune fusion d&apos;écriture.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
