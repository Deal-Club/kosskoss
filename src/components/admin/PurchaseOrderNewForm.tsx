"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupplierRecord } from "@/server/kk/fournisseurs";

export function PurchaseOrderNewForm({ suppliers }: { suppliers: SupplierRecord[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Choisissez un fournisseur.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/admin/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId, note }),
    });
    setPending(false);

    if (response.ok) {
      const bon = (await response.json()) as { id: string };
      router.push(`/admin/purchase-orders/${bon.id}`);
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de la création.");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl rounded-sm border border-border bg-white p-6">
      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Fournisseur</span>
        <select
          required
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        >
          <option value="">Choisir…</option>
          {suppliers.map((fournisseur) => (
            <option key={fournisseur.id} value={fournisseur.id}>
              {fournisseur.name}
            </option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <span className="mt-1 block text-xs text-destructive">
            Aucun fournisseur actif. Créez-en un d&apos;abord.
          </span>
        )}
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Note (facultatif)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <p className="mb-4 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
        Le bon est créé en brouillon. Les lignes s&apos;ajoutent sur l&apos;écran suivant, tant qu&apos;il
        n&apos;a pas été envoyé.
      </p>

      {error ? <p className="mb-4 text-sm font-semibold text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || suppliers.length === 0}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer le bon"}
      </button>
    </form>
  );
}
