"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CategoryPreview } from "@/components/admin/CategoryPreview";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { PreviewPanel } from "@/components/admin/PreviewPanel";
import { slugify } from "@/lib/slugify";
import type { CategoryGuideSection, CategoryRecord } from "@/server/types";

/** Liste des univers produits — vient de la base de données, plus codée en dur. */
export interface GroupOption {
  slug: string;
  label: string;
}

interface CategoryFormProps {
  mode: "new" | "edit";
  groups: GroupOption[];
  initialData?: CategoryRecord;
}

export function CategoryForm({ mode, groups, initialData }: CategoryFormProps) {
  const router = useRouter();
  const [group, setGroup] = useState(initialData?.group ?? groups[0]?.slug ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [image, setImage] = useState(initialData?.image ?? "");
  const [intro, setIntro] = useState(initialData?.guide.intro ?? "");
  const [closing, setClosing] = useState(initialData?.guide.closing ?? "");
  const [sections, setSections] = useState<CategoryGuideSection[]>(
    initialData?.guide.sections ?? [],
  );
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

  function updateSection(index: number, patch: Partial<CategoryGuideSection>) {
    setSections((current) =>
      current.map((section, position) => (position === index ? { ...section, ...patch } : section)),
    );
  }

  function addSection() {
    setSections((current) => [...current, { heading: "", body: "" }]);
  }

  function removeSection(index: number) {
    setSections((current) => current.filter((_, position) => position !== index));
  }

  /** Déplace une section d'une position (-1 vers le haut, +1 vers le bas). */
  function moveSection(index: number, offset: number) {
    setSections((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const moved = next[index];
      next[index] = next[target];
      next[target] = moved;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!group) {
      setError("Créez d'abord un univers produits.");
      return;
    }

    setPending(true);
    const payload = {
      group,
      slug,
      label,
      description,
      image,
      guide: {
        intro,
        closing,
        // Les sections vides sont écartées pour que le guide reste propre.
        sections: sections.filter((section) => section.heading.trim() || section.body.trim()),
      },
    };
    const url =
      mode === "new" ? "/api/admin/categories" : `/api/admin/categories/${initialData?.id}`;
    const method = mode === "new" ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    if (response.ok) {
      router.push("/admin/categories");
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de l'enregistrement.");
  }

  const groupLabel = groups.find((option) => option.slug === group)?.label ?? "";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={handleSubmit} className="min-w-0 max-w-2xl xl:max-w-none">
        <div className="mb-4 rounded-sm border border-border bg-white p-5">
          <h2 className="mb-4 text-sm font-black tracking-wide text-foreground uppercase">
            Informations générales
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Univers produits</span>
              <select
                required
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
              >
                {groups.length === 0 ? <option value="">Aucun univers disponible</option> : null}
                {groups.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Slug</span>
              <input
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Adresse : /{group || "univers"}/{slug || "categorie"}
              </span>
            </label>
          </div>

          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-semibold text-foreground">Libellé</span>
            <input
              required
              value={label}
              onChange={(event) => handleLabelChange(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-semibold text-foreground">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <ImageUploadField
            value={image}
            onChange={setImage}
            label="Image de la catégorie"
            hint="Envoyée sur Cloudinary. Elle sert de visuel d'en-tête et de repli pour les produits sans image."
          />
        </div>

        <div className="mb-4 rounded-sm border border-border bg-white p-5">
          <h2 className="mb-4 text-sm font-black tracking-wide text-foreground uppercase">
            Guide d&apos;achat
          </h2>

          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-semibold text-foreground">Introduction</span>
            <textarea
              value={intro}
              onChange={(event) => setIntro(event.target.value)}
              rows={3}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          {sections.length === 0 ? (
            <p className="mb-4 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
              Aucune section pour le moment. Les sections apparaissent sur la page catégorie sous
              forme de sous-titres.
            </p>
          ) : null}

          {sections.map((section, index) => (
            // Les sections n'ont pas d'ID propre ; la position sert ici de clé.
            <div key={index} className="mb-4 rounded-sm border border-border bg-muted p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black tracking-wide text-muted-foreground uppercase">
                  Section {index + 1}
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="rounded-sm border border-border bg-white px-2 py-1 text-foreground hover:border-primary disabled:opacity-40"
                  >
                    ↑ Monter
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="rounded-sm border border-border bg-white px-2 py-1 text-foreground hover:border-primary disabled:opacity-40"
                  >
                    ↓ Descendre
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="rounded-sm border border-border bg-white px-2 py-1 text-destructive hover:border-destructive"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <label className="mb-2 block text-sm">
                <span className="mb-1 block font-semibold text-foreground">Titre</span>
                <input
                  value={section.heading}
                  onChange={(event) => updateSection(index, { heading: event.target.value })}
                  className="w-full rounded-sm border border-border bg-white px-3 py-2 outline-none focus:border-primary"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-foreground">Text</span>
                <textarea
                  value={section.body}
                  onChange={(event) => updateSection(index, { body: event.target.value })}
                  rows={4}
                  className="w-full rounded-sm border border-border bg-white px-3 py-2 outline-none focus:border-primary"
                />
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={addSection}
            className="mb-4 rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            Ajouter une section
          </button>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-foreground">Conclusion</span>
            <textarea
              value={closing}
              onChange={(event) => setClosing(event.target.value)}
              rows={3}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        {error ? (
          <p className="mb-4 rounded-sm border border-destructive bg-white p-3 text-sm font-semibold text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      <PreviewPanel url={`mlc-bois.fr/${group || "univers"}/${slug || "categorie"}`}>
        <CategoryPreview
          groupSlug={group}
          groupLabel={groupLabel}
          label={label}
          description={description}
          image={image}
          intro={intro}
          closing={closing}
          sections={sections}
        />
      </PreviewPanel>
    </div>
  );
}
