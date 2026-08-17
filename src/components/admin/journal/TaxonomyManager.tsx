"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { cn } from "@/lib/utils";
import type { AuthorView, CategoryView, TagView } from "@/server/journal/taxonomy";

/**
 * Rubriques, tags et auteurs.
 *
 * Trois formulaires très courts sur un seul écran : les séparer en trois pages
 * aurait multiplié les allers-retours pour un travail qui se fait d'un bloc au
 * démarrage du Journal, puis presque plus jamais.
 *
 * Le nombre d'articles publiés est affiché à côté de chaque entrée, et ce n'est
 * pas décoratif : c'est lui qui décide de l'indexation. Une rubrique vide et un
 * tag utilisé une fois sortent du sitemap.
 */

const inputClass =
  "w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "block text-xs font-bold tracking-wide text-muted-foreground uppercase";

type Kind = "category" | "tag" | "author";

const TABS: { kind: Kind; label: string }[] = [
  { kind: "category", label: "Rubriques" },
  { kind: "tag", label: "Tags" },
  { kind: "author", label: "Auteurs" },
];

interface CategoryDraft {
  label: string;
  labelEn: string;
  description: string;
  image: string;
  metaTitle: string;
  metaDescription: string;
  parentId: string;
  position: number;
  active: boolean;
}

interface AuthorDraft {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  instagram: string;
  linkedin: string;
  active: boolean;
}

const EMPTY_CATEGORY: CategoryDraft = {
  label: "",
  labelEn: "",
  description: "",
  image: "",
  metaTitle: "",
  metaDescription: "",
  parentId: "",
  position: 0,
  active: true,
};

const EMPTY_AUTHOR: AuthorDraft = {
  name: "",
  role: "",
  bio: "",
  avatar: "",
  instagram: "",
  linkedin: "",
  active: true,
};

export function TaxonomyManager({
  categories,
  tags,
  authors,
}: {
  categories: readonly CategoryView[];
  tags: readonly TagView[];
  authors: readonly AuthorView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Kind>("category");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryDraft>(EMPTY_CATEGORY);
  const [tagDraft, setTagDraft] = useState({ label: "", labelEn: "" });
  const [author, setAuthor] = useState<AuthorDraft>(EMPTY_AUTHOR);

  function reset() {
    setEditingId(null);
    setCategory(EMPTY_CATEGORY);
    setTagDraft({ label: "", labelEn: "" });
    setAuthor(EMPTY_AUTHOR);
    setError(null);
  }

  async function save(kind: Kind, values: unknown) {
    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/journal/taxonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id: editingId, values }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error ?? "Échec de l'enregistrement.");
      return;
    }
    reset();
    router.refresh();
  }

  async function remove(kind: Kind, id: string, label: string) {
    const message =
      kind === "category"
        ? `Supprimer la rubrique « ${label} » ? Les articles qui s'y trouvent ne sont pas supprimés : ils se retrouvent simplement sans rubrique.`
        : kind === "author"
          ? `Supprimer l'auteur « ${label} » ? Ses articles restent publiés, sans signature.`
          : `Supprimer le tag « ${label} » ?`;

    if (!window.confirm(message)) return;

    setPending(true);
    const response = await fetch(
      `/api/admin/journal/taxonomy?kind=${kind}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error ?? "Suppression impossible.");
      return;
    }
    router.refresh();
  }

  function countLabel(count: number): string {
    return count === 0
      ? "aucun article publié"
      : `${count} article${count > 1 ? "s" : ""} publié${count > 1 ? "s" : ""}`;
  }

  return (
    <div>
      {/* ---- Onglets ---- */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {TABS.map((entry) => (
          <button
            key={entry.kind}
            type="button"
            onClick={() => {
              setTab(entry.kind);
              reset();
            }}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-bold transition",
              tab === entry.kind
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-sm border border-destructive bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* ---- Liste ---- */}
        <div className="rounded-sm border border-border bg-white">
          <ul className="divide-y divide-border">
            {tab === "category" &&
              categories.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">
                      {entry.label}
                      {!entry.active ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (masquée)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      /journal/categorie/{entry.slug} · {countLabel(entry.publishedCount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(entry.id);
                      setCategory({
                        label: entry.label,
                        labelEn: "",
                        description: entry.description,
                        image: entry.image,
                        metaTitle: entry.metaTitle,
                        metaDescription: entry.metaDescription,
                        parentId: entry.parentId ?? "",
                        position: entry.position,
                        active: entry.active,
                      });
                    }}
                    className="rounded-sm p-1.5 text-muted-foreground hover:text-primary"
                    aria-label={`Modifier ${entry.label}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove("category", entry.id, entry.label)}
                    className="rounded-sm p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer ${entry.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}

            {tab === "tag" &&
              tags.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{entry.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /journal/tag/{entry.slug} · {countLabel(entry.publishedCount)}
                      {entry.publishedCount > 0 && entry.publishedCount < 3
                        ? " · hors sitemap tant qu'il reste sous trois articles"
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(entry.id);
                      setTagDraft({ label: entry.label, labelEn: "" });
                    }}
                    className="rounded-sm p-1.5 text-muted-foreground hover:text-primary"
                    aria-label={`Modifier ${entry.label}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove("tag", entry.id, entry.label)}
                    className="rounded-sm p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer ${entry.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}

            {tab === "author" &&
              authors.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">
                      {entry.name}
                      {entry.role ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {entry.role}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      /journal/auteur/{entry.slug} · {countLabel(entry.publishedCount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(entry.id);
                      setAuthor({
                        name: entry.name,
                        role: entry.role,
                        bio: entry.bio,
                        avatar: entry.avatar,
                        instagram: entry.socials.instagram ?? "",
                        linkedin: entry.socials.linkedin ?? "",
                        active: entry.active,
                      });
                    }}
                    className="rounded-sm p-1.5 text-muted-foreground hover:text-primary"
                    aria-label={`Modifier ${entry.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove("author", entry.id, entry.name)}
                    className="rounded-sm p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer ${entry.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}

            {((tab === "category" && categories.length === 0) ||
              (tab === "tag" && tags.length === 0) ||
              (tab === "author" && authors.length === 0)) && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                Rien à afficher pour l&apos;instant.
              </li>
            )}
          </ul>
        </div>

        {/* ---- Formulaire ---- */}
        <div className="rounded-sm border border-border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {editingId ? "Modifier" : "Ajouter"}
            </h2>
            {editingId ? (
              <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:underline">
                Annuler
              </button>
            ) : null}
          </div>

          {tab === "category" ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void save("category", { ...category, parentId: category.parentId || null });
              }}
            >
              <label className="block">
                <span className={labelClass}>Nom</span>
                <input
                  value={category.label}
                  onChange={(event) => setCategory({ ...category, label: event.target.value })}
                  required
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Nom en anglais</span>
                <input
                  value={category.labelEn}
                  onChange={(event) => setCategory({ ...category, labelEn: event.target.value })}
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  value={category.description}
                  onChange={(event) => setCategory({ ...category, description: event.target.value })}
                  rows={3}
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Rubrique parente</span>
                <select
                  value={category.parentId}
                  onChange={(event) => setCategory({ ...category, parentId: event.target.value })}
                  className={cn(inputClass, "mt-1")}
                >
                  <option value="">— Aucune —</option>
                  {categories
                    .filter((entry) => entry.id !== editingId && !entry.parentId)
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                </select>
              </label>
              <ImageUploadField
                label="Image"
                value={category.image}
                onChange={(image) => setCategory({ ...category, image })}
              />
              <label className="block">
                <span className={labelClass}>Ordre d&apos;affichage</span>
                <input
                  type="number"
                  value={category.position}
                  onChange={(event) =>
                    setCategory({ ...category, position: Number(event.target.value) })
                  }
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={category.active}
                  onChange={(event) => setCategory({ ...category, active: event.target.checked })}
                />
                Visible sur la boutique
              </label>

              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {editingId ? "Enregistrer" : "Ajouter la rubrique"}
              </button>
            </form>
          ) : null}

          {tab === "tag" ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void save("tag", tagDraft);
              }}
            >
              <label className="block">
                <span className={labelClass}>Nom</span>
                <input
                  value={tagDraft.label}
                  onChange={(event) => setTagDraft({ ...tagDraft, label: event.target.value })}
                  required
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Nom en anglais</span>
                <input
                  value={tagDraft.labelEn}
                  onChange={(event) => setTagDraft({ ...tagDraft, labelEn: event.target.value })}
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Créez un tag quand il regroupera au moins trois articles : en dessous, sa page fait
                doublon avec l&apos;article lui-même et n&apos;apporte rien au référencement.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {editingId ? "Enregistrer" : "Ajouter le tag"}
              </button>
            </form>
          ) : null}

          {tab === "author" ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void save("author", {
                  name: author.name,
                  role: author.role,
                  roleEn: "",
                  bio: author.bio,
                  bioEn: "",
                  avatar: author.avatar,
                  active: author.active,
                  socials: {
                    ...(author.instagram ? { instagram: author.instagram } : {}),
                    ...(author.linkedin ? { linkedin: author.linkedin } : {}),
                  },
                });
              }}
            >
              <label className="block">
                <span className={labelClass}>Nom</span>
                <input
                  value={author.name}
                  onChange={(event) => setAuthor({ ...author, name: event.target.value })}
                  required
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Fonction</span>
                <input
                  value={author.role}
                  onChange={(event) => setAuthor({ ...author, role: event.target.value })}
                  className={cn(inputClass, "mt-1")}
                  placeholder="Conseillère beauté"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Biographie</span>
                <textarea
                  value={author.bio}
                  onChange={(event) => setAuthor({ ...author, bio: event.target.value })}
                  rows={4}
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <ImageUploadField
                label="Photo"
                value={author.avatar}
                onChange={(avatar) => setAuthor({ ...author, avatar })}
              />
              <label className="block">
                <span className={labelClass}>Instagram</span>
                <input
                  value={author.instagram}
                  onChange={(event) => setAuthor({ ...author, instagram: event.target.value })}
                  className={cn(inputClass, "mt-1")}
                  placeholder="https://instagram.com/…"
                />
              </label>
              <label className="block">
                <span className={labelClass}>LinkedIn</span>
                <input
                  value={author.linkedin}
                  onChange={(event) => setAuthor({ ...author, linkedin: event.target.value })}
                  className={cn(inputClass, "mt-1")}
                  placeholder="https://linkedin.com/in/…"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={author.active}
                  onChange={(event) => setAuthor({ ...author, active: event.target.checked })}
                />
                Page auteur visible
              </label>

              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {editingId ? "Enregistrer" : "Ajouter l'auteur"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
