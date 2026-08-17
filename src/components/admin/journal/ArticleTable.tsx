"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Star } from "lucide-react";
import { PreviewImage } from "@/components/admin/PreviewImage";
import { cn } from "@/lib/utils";
import { ARTICLE_STATUS_LABELS, type ArticleStatus } from "@/types/journal";
import type { AdminArticleRow } from "@/server/journal/store";

/**
 * Tableau des articles, avec sélection et actions groupées.
 *
 * La sélection impose un composant client ; le filtrage, le tri et la
 * pagination restent côté serveur, dans l'URL. Un écran filtré reste donc
 * partageable et rechargeable — ce que perdrait un état gardé en mémoire.
 */

const STATUS_STYLES: Record<ArticleStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-trust-soft text-trust",
  published: "bg-primary/10 text-primary",
  archived: "bg-foreground/10 text-foreground/70",
};

interface BulkAction {
  action: "publish" | "draft" | "archive" | "trash" | "restore" | "purge";
  label: string;
  confirm?: string;
  tone?: "danger";
}

const LIVE_ACTIONS: BulkAction[] = [
  { action: "publish", label: "Publier" },
  { action: "draft", label: "Repasser en brouillon" },
  { action: "archive", label: "Archiver" },
  {
    action: "trash",
    label: "Mettre à la corbeille",
    confirm: "Mettre les articles sélectionnés à la corbeille ?",
  },
];

const TRASH_ACTIONS: BulkAction[] = [
  { action: "restore", label: "Restaurer" },
  {
    action: "purge",
    label: "Supprimer définitivement",
    confirm:
      "Suppression DÉFINITIVE : le contenu, ses versions et ses statistiques disparaissent. Continuer ?",
    tone: "danger",
  },
];

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function ArticleTable({
  articles,
  trashed = false,
}: {
  articles: readonly AdminArticleRow[];
  trashed?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = trashed ? TRASH_ACTIONS : LIVE_ACTIONS;
  const allSelected = articles.length > 0 && selected.length === articles.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  async function run(action: BulkAction) {
    if (selected.length === 0) return;
    if (action.confirm && !window.confirm(action.confirm)) return;

    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/journal/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action.action, ids: selected }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "L'action a échoué.");
      return;
    }

    setSelected([]);
    router.refresh();
  }

  if (articles.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border bg-white px-6 py-12 text-center text-sm text-muted-foreground">
        {trashed ? "La corbeille est vide." : "Aucun article ne correspond à ces critères."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* ---- Actions groupées ---- */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-sm border px-4 py-2 transition",
          selected.length > 0 ? "border-primary bg-primary/5" : "border-transparent",
        )}
      >
        {selected.length > 0 ? (
          <>
            <span className="text-sm font-bold text-foreground">
              {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
            </span>
            {actions.map((action) => (
              <button
                key={action.action}
                type="button"
                disabled={pending}
                onClick={() => run(action)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-sm font-bold disabled:opacity-50",
                  action.tone === "danger"
                    ? "border-destructive text-destructive hover:bg-destructive/10"
                    : "border-border bg-white text-foreground hover:border-primary",
                )}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-sm text-muted-foreground hover:underline"
            >
              Tout désélectionner
            </button>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            Cochez des articles pour agir sur plusieurs à la fois.
          </span>
        )}
      </div>

      {error ? (
        <p role="alert" className="rounded-sm border border-destructive bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* ---- Tableau ---- */}
      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : articles.map((a) => a.id))}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th scope="col" className="px-4 py-3">Article</th>
              <th scope="col" className="px-4 py-3">Rubrique</th>
              <th scope="col" className="px-4 py-3">Auteur</th>
              <th scope="col" className="px-4 py-3">Statut</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3 text-right">Vues</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {articles.map((article) => (
              <tr key={article.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.includes(article.id)}
                    onChange={() => toggle(article.id)}
                    aria-label={`Sélectionner « ${article.title} »`}
                  />
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <PreviewImage
                      src={article.coverImage}
                      alt=""
                      compact
                      wrapperClassName="h-12 w-16 shrink-0 overflow-hidden rounded-sm"
                      sizes="64px"
                      emptyLabel=""
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-bold text-foreground">
                        {article.featured ? (
                          <Star
                            className="h-3.5 w-3.5 shrink-0 fill-current text-primary"
                            aria-label="À la une"
                          />
                        ) : null}
                        <span className="truncate">{article.title}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">/journal/{article.slug}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 align-top text-muted-foreground">
                  {article.categoryLabel || "—"}
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  {article.authorName || "—"}
                </td>

                <td className="px-4 py-3 align-top">
                  <span
                    className={cn(
                      "inline-block rounded-sm px-2 py-0.5 text-xs font-bold",
                      STATUS_STYLES[article.status],
                    )}
                  >
                    {ARTICLE_STATUS_LABELS[article.status]}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                  {article.status === "scheduled"
                    ? `Prévu ${formatDate(article.scheduledAt)}`
                    : formatDate(article.publishedAt ?? article.updatedAt)}
                </td>

                <td className="px-4 py-3 text-right align-top tabular-nums text-muted-foreground">
                  {article.viewCount}
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/journal/${article.id}/apercu`}
                      target="_blank"
                      className="rounded-sm p-1.5 text-muted-foreground hover:text-primary"
                      aria-label={`Prévisualiser « ${article.title} »`}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/journal/${article.id}`}
                      className="rounded-sm p-1.5 text-muted-foreground hover:text-primary"
                      aria-label={`Modifier « ${article.title} »`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
