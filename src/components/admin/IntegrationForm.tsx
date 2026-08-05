"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationRecord } from "@/server/types";

interface IntegrationFormProps {
  integration: IntegrationRecord;
}

export function IntegrationForm({ integration }: IntegrationFormProps) {
  const router = useRouter();
  // Le champ reste vide au chargement : le serveur ne renvoie jamais le secret.
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function call(init: RequestInit, fallback: string, query = "") {
    setPending(true);
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/admin/integrations/${integration.key}${query}`, init);
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? fallback);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Veuillez saisir une valeur.");
      return;
    }

    const ok = await call(
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      },
      "Échec de l'enregistrement.",
    );

    if (ok) {
      setValue("");
      setNotice("Clé enregistrée.");
    }
  }

  async function handleClear() {
    if (!window.confirm(`Supprimer définitivement la clé de « ${integration.label} » ?`)) return;
    const ok = await call({ method: "DELETE" }, "Échec de la suppression.");
    if (ok) setNotice("Clé supprimée.");
  }

  function handleToggle() {
    void call(
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !integration.enabled }),
      },
      "Le statut n'a pas pu être modifié.",
    );
  }

  return (
    <div className="rounded-sm border border-border bg-white p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-foreground">{integration.label}</h3>
          <p className="text-sm text-muted-foreground">{integration.description}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{integration.key}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-sm px-2 py-1 text-xs font-bold ${
              integration.configured
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {integration.configured ? "Configurée" : "Non configurée"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={integration.enabled}
            aria-label={`Activer ${integration.label}`}
            onClick={handleToggle}
            disabled={pending}
            className={`flex h-6 w-11 items-center rounded-full p-0.5 transition disabled:opacity-50 ${
              integration.enabled ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white transition ${
                integration.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            {integration.enabled ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <p className="mb-3 text-sm">
        <span className="font-semibold text-foreground">Valeur enregistrée : </span>
        <span className="font-mono text-muted-foreground">
          {integration.maskedValue ?? "— aucune clé enregistrée —"}
        </span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            {integration.configured ? "Saisir une nouvelle clé" : "Saisir la clé"}
          </span>
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="••••••••••••••••"
            className="w-full rounded-sm border border-border px-3 py-2 font-mono outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={pending || !integration.configured}
          className="rounded-sm border border-border px-4 py-2.5 text-sm font-bold text-destructive hover:bg-muted disabled:opacity-40"
        >
          Supprimer
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}
      {notice && <p className="mt-3 text-sm font-semibold text-foreground">{notice}</p>}
    </div>
  );
}

export function IntegrationCreateForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!key.trim() || !label.trim()) {
      setError("La clé et le libellé sont obligatoires.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label, description }),
    });
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Échec de la création.");
      return;
    }

    setKey("");
    setLabel("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border border-border bg-white p-4 md:p-6">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Clé</span>
          <input
            required
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="ex. mollie_api_key"
            className="w-full rounded-sm border border-border px-3 py-2 font-mono outline-none focus:border-primary"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Libellé</span>
          <input
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="ex. Mollie API Key"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Description</span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="À quoi sert cet accès ?"
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      {error && <p className="mb-4 text-sm font-semibold text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer l'intégration"}
      </button>
    </form>
  );
}
