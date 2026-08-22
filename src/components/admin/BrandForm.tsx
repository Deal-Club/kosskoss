"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { slugify } from "@/lib/slugify";
import type { MarqueRecord } from "@/server/kk/marques";

interface BrandFormProps {
  mode: "new" | "edit";
  initialData?: MarqueRecord;
}

export function BrandForm({ mode, initialData }: BrandFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [nameEn, setNameEn] = useState(initialData?.nameEn ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn ?? "");
  const [logo, setLogo] = useState(initialData?.logo ?? "");
  const [position, setPosition] = useState(initialData?.position?.toString() ?? "0");
  const [active, setActive] = useState(initialData?.active ?? true);
  // Tant que le slug n'a pas été modifié à la main, il suit le nom.
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const url = mode === "new" ? "/api/admin/brands" : `/api/admin/brands/${initialData?.id}`;
    const method = mode === "new" ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        nameEn,
        slug: slug || name,
        description,
        descriptionEn,
        logo,
        position: Number.parseInt(position, 10) || 0,
        active,
      }),
    });

    setPending(false);
    if (response.ok) {
      router.push("/admin/brands");
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de l'enregistrement.");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-sm border border-border bg-white p-6">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom</span>
          <input
            required
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="ex. Nivea"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom (anglais)</span>
          <input
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            placeholder="Laissé vide, le français s'affiche."
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Slug (partie de l&apos;URL)</span>
        <input
          required
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          placeholder="nivea"
          className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Donne une adresse du type /marques/{slug || "marque"}
        </span>
      </label>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Description (anglaise)</span>
          <textarea
            value={descriptionEn}
            onChange={(event) => setDescriptionEn(event.target.value)}
            rows={3}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <ImageUploadField
        value={logo}
        onChange={setLogo}
        label="Logo de la marque"
        hint="Envoyé sur Cloudinary. Affiché sur la page de la marque et dans le back-office."
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Ordre d&apos;affichage</span>
          <input
            type="number"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Les plus petits nombres apparaissent en premier sur la vitrine.
          </span>
        </label>

        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span className="font-semibold text-foreground">Marque active</span>
        </label>
      </div>

      <p className="mb-4 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
        Une marque inactive quitte la vitrine sans qu&apos;on touche à ses produits — ils gardent
        leur libellé de marque.
      </p>

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
