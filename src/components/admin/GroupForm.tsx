"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slugify";

export interface AdminGroupSummary {
  id: string;
  slug: string;
  label: string;
  position: number;
  categoryCount: number;
}

interface GroupFormProps {
  mode: "new" | "edit";
  initialData?: AdminGroupSummary;
}

export function GroupForm({ mode, initialData }: GroupFormProps) {
  const router = useRouter();
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [position, setPosition] = useState(initialData?.position?.toString() ?? "0");
  // Tant que le slug n'a pas été modifié à la main, il suit le libellé.
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const url = mode === "new" ? "/api/admin/groups" : `/api/admin/groups/${initialData?.id}`;
    const method = mode === "new" ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        slug: slug || label,
        position: Number.parseInt(position, 10) || 0,
      }),
    });

    setPending(false);
    if (response.ok) {
      router.push("/admin/groups");
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de l'enregistrement.");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-sm border border-border bg-white p-6">
      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Libellé</span>
        <input
          required
          value={label}
          onChange={(event) => handleLabelChange(event.target.value)}
          placeholder="ex. Haushalt"
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Slug (partie de l&apos;URL)</span>
          <input
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="haushalt"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Donne des adresses du type /{slug || "univers"}/kaffeemaschinen
          </span>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Ordre d&apos;affichage</span>
          <input
            type="number"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Les plus petits nombres apparaissent en premier dans le menu.
          </span>
        </label>
      </div>

      {mode === "edit" && initialData ? (
        <p className="mb-4 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
          Cet univers contient actuellement {initialData.categoryCount}{" "}
          {initialData.categoryCount === 1 ? "catégorie" : "catégories"}. Modifier le slug change les
          adresses publiques de toutes les pages qu&apos;il contient.
        </p>
      ) : null}

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

/**
 * Suppression avec retour d'information : l'API refuse les univers qui contiennent
 * encore des catégories — ce message est affiché ici en clair.
 */
export function GroupDeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement l'univers « ${label} » ?`)) return;
    setError(null);
    setPending(true);

    const response = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    setPending(false);

    if (response.ok) {
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de la suppression.");
  }

  return (
    <div className="inline-block text-right">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="font-semibold text-destructive hover:underline disabled:opacity-50"
      >
        Supprimer
      </button>
      {error ? <p className="mt-1 max-w-xs text-xs font-normal text-destructive">{error}</p> : null}
    </div>
  );
}
