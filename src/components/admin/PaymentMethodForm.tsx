"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethodRecord } from "@/server/types";

// Doit rester aligné avec la table d'icônes de src/components/PaymentMethodsBar.tsx.
const ICON_OPTIONS = [
  { value: "credit-card", label: "Carte bancaire" },
  { value: "wallet", label: "Portefeuille" },
  { value: "file-text", label: "Facture" },
  { value: "banknote", label: "Billet" },
  { value: "zap", label: "Paiement immédiat" },
  { value: "landmark", label: "Banque" },
  { value: "smartphone", label: "Mobile" },
  { value: "shield-check", label: "Protection acheteur" },
  { value: "truck", label: "Contre remboursement" },
  { value: "gift", label: "Bon d'achat" },
] as const;

interface PaymentMethodFormProps {
  mode: "new" | "edit";
  initialData?: PaymentMethodRecord;
  onCancel?: () => void;
  onSaved?: () => void;
}

export function PaymentMethodForm({
  mode,
  initialData,
  onCancel,
  onSaved,
}: PaymentMethodFormProps) {
  const router = useRouter();
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [icon, setIcon] = useState(initialData?.icon ?? "credit-card");
  const [feeLabel, setFeeLabel] = useState(initialData?.feeLabel ?? "Gratuit");
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError("Veuillez indiquer un nom pour le moyen de paiement.");
      return;
    }

    setPending(true);
    const url =
      mode === "new"
        ? "/api/admin/payment-methods"
        : `/api/admin/payment-methods/${initialData?.id}`;
    const response = await fetch(url, {
      method: mode === "new" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, description, icon, feeLabel, enabled }),
    });
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Échec de l'enregistrement.");
      return;
    }

    if (mode === "new") {
      setLabel("");
      setDescription("");
      setIcon("credit-card");
      setFeeLabel("Gratuit");
      setEnabled(true);
    }
    router.refresh();
    onSaved?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-sm border border-border bg-white p-4 md:p-6"
    >
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom</span>
          <input
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="ex. Paiement à la livraison"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            Mention des frais (texte affiché en boutique)
          </span>
          <input
            value={feeLabel}
            onChange={(event) => setFeeLabel(event.target.value)}
            placeholder="Gratuit"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="Courte indication affichée aux clients"
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Icône</span>
          <select
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          >
            {ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mb-2.5 h-4 w-4 accent-primary"
          />
          <span className="mb-2 font-semibold text-foreground">Afficher dans la boutique</span>
        </label>
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {pending
            ? "Enregistrement…"
            : mode === "new"
              ? "Créer le moyen de paiement"
              : "Enregistrer"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
