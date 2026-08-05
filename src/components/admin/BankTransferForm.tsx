"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BankTransferSettings } from "@/server/bankTransfer";

/**
 * Coordonnées du virement bancaire. Ce que le commerçant saisit ici s'affiche à
 * l'identique sur la page de confirmation de commande et dans l'e-mail de
 * confirmation, pour les commandes réglées par virement.
 */
export function BankTransferForm({ initial }: { initial: BankTransferSettings }) {
  const router = useRouter();
  const [holder, setHolder] = useState(initial.holder);
  const [iban, setIban] = useState(initial.iban);
  const [bic, setBic] = useState(initial.bic);
  const [transferType, setTransferType] = useState(initial.transferType);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    const response = await fetch("/api/admin/bank-transfer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holder, iban, bic, transferType }),
    });
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Échec de l'enregistrement.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border border-border bg-white p-4 md:p-6">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Titulaire du compte</span>
          <input
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
            placeholder="ex. MLC Bois"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Type de virement</span>
          <input
            value={transferType}
            onChange={(event) => setTransferType(event.target.value)}
            placeholder="ex. Virement instantané"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">IBAN</span>
          <input
            value={iban}
            onChange={(event) => setIban(event.target.value)}
            placeholder="FR76 3000 4000 0500 0012 3456 789"
            className="w-full rounded-sm border border-border px-3 py-2 font-mono outline-none focus:border-primary"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">BIC / SWIFT</span>
          <input
            value={bic}
            onChange={(event) => setBic(event.target.value)}
            placeholder="BNPAFRPPXXX"
            className="w-full rounded-sm border border-border px-3 py-2 font-mono outline-none focus:border-primary"
          />
        </label>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Le texte des instructions est fixe : seules ces coordonnées changent. Le numéro de commande
        est ajouté automatiquement comme référence du virement.
      </p>

      {error && <p className="mb-4 text-sm font-semibold text-destructive">{error}</p>}
      {saved && !error && (
        <p className="mb-4 text-sm font-semibold text-emerald-600">Coordonnées enregistrées.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer les coordonnées"}
      </button>
    </form>
  );
}
