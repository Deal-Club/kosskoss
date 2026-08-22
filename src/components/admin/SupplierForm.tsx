"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupplierRecord } from "@/server/kk/fournisseurs";

interface SupplierFormProps {
  mode: "new" | "edit";
  initialData?: SupplierRecord;
}

export function SupplierForm({ mode, initialData }: SupplierFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [active, setActive] = useState(initialData?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const url = mode === "new" ? "/api/admin/suppliers" : `/api/admin/suppliers/${initialData?.id}`;
    const method = mode === "new" ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, address, notes, active }),
    });

    setPending(false);
    if (response.ok) {
      router.push("/admin/suppliers");
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de l'enregistrement.");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-sm border border-border bg-white p-6">
      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Nom</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ex. Scieries du Perche"
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Courriel</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Téléphone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Adresse</span>
        <textarea
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          rows={2}
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        <span className="font-semibold text-foreground">Fournisseur actif</span>
      </label>

      {error ? <p className="mb-4 text-sm font-semibold text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
