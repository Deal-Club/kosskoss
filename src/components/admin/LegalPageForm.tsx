"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { RichTextField } from "@/components/admin/RichTextField";
import { cn } from "@/lib/utils";
import type { LegalPageInput, LegalSectionInput } from "@/server/legalPageInput";
import type { LegalLocale, LegalSlug } from "@/content/legal/types";

/**
 * Édition d'une page légale dans les deux langues.
 *
 * Chaque langue a son propre brouillon et son propre état « modifié ». Publier
 * envoie toutes les langues modifiées : basculer d'onglet ne doit jamais faire
 * perdre une saisie, c'est l'erreur la plus facile à commettre sur ce genre de
 * formulaire.
 */

export interface LegalPageFormData {
  content: LegalPageInput;
  customized: boolean;
  /** Date ISO de la dernière publication, ou null si la page n'a jamais été modifiée. */
  updatedAt: string | null;
  updatedBy: string | null;
}

interface LegalPageFormProps {
  slug: LegalSlug;
  label: string;
  versions: Record<LegalLocale, LegalPageFormData>;
}

const LOCALES: readonly LegalLocale[] = ["fr", "en"];
const LOCALE_LABELS: Record<LegalLocale, string> = { fr: "Français", en: "English" };

/** Adresse publique de la page, pour l'aller voir après publication. */
function publicHref(slug: LegalSlug, locale: LegalLocale): string {
  return locale === "fr" ? `/${slug}` : `/en/${slug}`;
}

function emptySection(): LegalSectionInput {
  return { heading: "", body: "", list: [] };
}

/** Comparaison de brouillons : suffisante pour savoir s'il reste à publier. */
function isSame(a: LegalPageInput, b: LegalPageInput): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function LegalPageForm({ slug, label, versions }: LegalPageFormProps) {
  const router = useRouter();

  const [locale, setLocale] = useState<LegalLocale>("fr");
  const [drafts, setDrafts] = useState<Record<LegalLocale, LegalPageInput>>({
    fr: versions.fr.content,
    en: versions.en.content,
  });
  // Référence de comparaison : ce qui est actuellement en ligne.
  const [published, setPublished] = useState<Record<LegalLocale, LegalPageInput>>({
    fr: versions.fr.content,
    en: versions.en.content,
  });
  const [customized, setCustomized] = useState<Record<LegalLocale, boolean>>({
    fr: versions.fr.customized,
    en: versions.en.customized,
  });

  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const draft = drafts[locale];
  const dirtyLocales = LOCALES.filter((code) => !isSame(drafts[code], published[code]));
  const isDirty = dirtyLocales.length > 0;

  function update(changes: Partial<LegalPageInput>) {
    setDrafts((current) => ({ ...current, [locale]: { ...current[locale], ...changes } }));
    setNotice(null);
  }

  function updateSection(index: number, changes: Partial<LegalSectionInput>) {
    update({
      sections: draft.sections.map((section, position) =>
        position === index ? { ...section, ...changes } : section,
      ),
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.sections.length) return;

    const sections = [...draft.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    update({ sections });
    setOpenSections(new Set());
  }

  function removeSection(index: number) {
    const heading = draft.sections[index].heading || `section ${index + 1}`;
    if (!window.confirm(`Supprimer la section « ${heading} » ?`)) return;
    update({ sections: draft.sections.filter((_, position) => position !== index) });
    setOpenSections(new Set());
  }

  function addSection() {
    update({ sections: [...draft.sections, emptySection()] });
    setOpenSections(new Set([draft.sections.length]));
  }

  function toggleSection(index: number) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handlePublish() {
    setError(null);
    setNotice(null);
    setPending(true);

    for (const code of dirtyLocales) {
      const response = await fetch(`/api/admin/pages/${slug}?locale=${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: drafts[code] }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setPending(false);
        setLocale(code);
        setError(
          `${LOCALE_LABELS[code]} : ${data?.error ?? "échec de l'enregistrement."} Les autres langues n'ont pas été publiées.`,
        );
        return;
      }

      // Le serveur renvoie le contenu tel qu'il l'a normalisé (sections vides
      // retirées, espaces nettoyés) : c'est lui qui fait foi, pas le brouillon.
      const data = (await response.json()) as { content: LegalPageInput };
      setDrafts((current) => ({ ...current, [code]: data.content }));
      setPublished((current) => ({ ...current, [code]: data.content }));
      setCustomized((current) => ({ ...current, [code]: true }));
    }

    setPending(false);
    setNotice(
      dirtyLocales.length > 1
        ? "Publié en français et en anglais. Le site est à jour."
        : `Publié (${LOCALE_LABELS[dirtyLocales[0]]}). Le site est à jour.`,
    );
    router.refresh();
  }

  async function handleReset() {
    const confirmed = window.confirm(
      `Rétablir le contenu d'origine de « ${label} » en ${LOCALE_LABELS[locale]} ?\n\n` +
        "Toutes les modifications publiées dans cette langue seront perdues.",
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    setPending(true);

    const response = await fetch(`/api/admin/pages/${slug}?locale=${locale}`, { method: "DELETE" });
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Échec de la réinitialisation.");
      return;
    }

    const data = (await response.json()) as { content: LegalPageInput };
    setDrafts((current) => ({ ...current, [locale]: data.content }));
    setPublished((current) => ({ ...current, [locale]: data.content }));
    setCustomized((current) => ({ ...current, [locale]: false }));
    setNotice(`Contenu d'origine rétabli (${LOCALE_LABELS[locale]}).`);
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      {/* Onglets de langue */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border">
        {LOCALES.map((code) => {
          const active = code === locale;
          const modified = !isSame(drafts[code], published[code]);
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {LOCALE_LABELS[code]}
              {modified && (
                <span
                  title="Modifications non publiées"
                  className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground"
                >
                  modifié
                </span>
              )}
              {!modified && !customized[code] && (
                <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  d&apos;origine
                </span>
              )}
            </button>
          );
        })}

        <Link
          href={publicHref(slug, locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 py-2 text-xs font-semibold text-primary hover:underline"
        >
          Voir la page en ligne
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {versions[locale].updatedAt
          ? `Dernière publication le ${new Date(versions[locale].updatedAt).toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })} par ${versions[locale].updatedBy}.`
          : "Cette page n'a jamais été modifiée : elle affiche le texte livré avec le site."}
      </p>

      <div className="rounded-sm border border-border bg-white p-5">
        <RichTextField
          label="Titre de la page"
          value={draft.title}
          onChange={(title) => update({ title })}
          singleLine
          required
          hint="Sert aussi de libellé du lien dans le pied de page et de titre dans l'onglet du navigateur."
        />

        <RichTextField
          label="Chapeau"
          value={draft.intro}
          onChange={(intro) => update({ intro })}
          rows={5}
          hint="Encadré affiché avant les sections. Laissez vide pour ne pas l'afficher. Une ligne vide sépare deux paragraphes."
        />

        <label className="mb-6 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">Date de révision</span>
          <input
            type="date"
            value={draft.updatedAt}
            onChange={(event) => update({ updatedAt: event.target.value })}
            className="rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Affichée en bas de page (« Stand »). À avancer quand le texte change sur le fond, à
            laisser telle quelle pour une simple correction de forme.
          </span>
        </label>

        {/* Sections */}
        <div className="mb-3 flex items-center justify-between border-t border-border pt-5">
          <h2 className="text-sm font-black text-foreground">
            Sections
            <span className="ml-2 font-semibold text-muted-foreground">
              ({draft.sections.length})
            </span>
          </h2>
          <button
            type="button"
            onClick={() =>
              setOpenSections((current) =>
                current.size === draft.sections.length
                  ? new Set()
                  : new Set(draft.sections.map((_, index) => index)),
              )
            }
            className="text-xs font-semibold text-primary hover:underline"
          >
            {openSections.size === draft.sections.length ? "Tout replier" : "Tout déplier"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {draft.sections.map((section, index) => (
            <SectionCard
              key={index}
              index={index}
              total={draft.sections.length}
              section={section}
              open={openSections.has(index)}
              onToggle={() => toggleSection(index)}
              onChange={(changes) => updateSection(index, changes)}
              onMove={(direction) => moveSection(index, direction)}
              onRemove={() => removeSection(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addSection}
          className="mt-3 flex items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Ajouter une section
        </button>
      </div>

      {/* Barre d'actions */}
      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 border-t border-border bg-muted/95 px-1 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handlePublish}
          disabled={pending || !isDirty}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Publication…" : isDirty ? "Publier" : "Rien à publier"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={pending || !customized[locale]}
          title={
            customized[locale]
              ? undefined
              : "Cette page affiche déjà le contenu d'origine dans cette langue."
          }
          className="flex items-center gap-2 rounded-sm border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:border-destructive hover:text-destructive disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground/80"
        >
          <RotateCcw className="h-4 w-4" />
          Contenu d&apos;origine ({LOCALE_LABELS[locale]})
        </button>

        {isDirty && (
          <span className="text-xs font-semibold text-muted-foreground">
            Modifications non publiées : {dirtyLocales.map((code) => LOCALE_LABELS[code]).join(", ")}
          </span>
        )}

        {error && <p className="w-full text-sm font-semibold text-destructive">{error}</p>}
        {notice && <p className="w-full text-sm font-semibold text-primary">{notice}</p>}
      </div>
    </div>
  );
}

function SectionCard({
  index,
  total,
  section,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  section: LegalSectionInput;
  open: boolean;
  onToggle: () => void;
  onChange: (changes: Partial<LegalSectionInput>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn("rounded-sm border bg-white", open ? "border-primary/40" : "border-border")}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-bold text-foreground hover:text-primary"
        >
          <span className="w-6 shrink-0 text-xs font-black text-muted-foreground">{index + 1}</span>
          <span className="truncate">
            {section.heading || <span className="text-muted-foreground italic">Sans titre</span>}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label="Monter" disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton label="Descendre" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ChevronDown className="h-4 w-4" />
          </IconButton>
          <IconButton label="Supprimer la section" destructive onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-3 pt-3">
          <RichTextField
            label="Titre de la section"
            value={section.heading}
            onChange={(heading) => onChange({ heading })}
            singleLine
            required
          />
          <RichTextField
            label="Texte"
            value={section.body}
            onChange={(body) => onChange({ body })}
            rows={8}
            hint="Une ligne vide sépare deux paragraphes. Un simple retour à la ligne reste un retour à la ligne."
          />
          <ListEditor items={section.list} onChange={(list) => onChange({ list })} />
        </div>
      )}
    </div>
  );
}

/** Puces d'une section : adresses, conditions, étapes… */
function ListEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-sm font-semibold text-foreground">
        Liste à puces
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          affichée sous le texte
        </span>
      </p>

      {items.map((item, index) => (
        <div key={index} className="mb-2 flex items-start gap-2">
          <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
          <input
            type="text"
            value={item}
            onChange={(event) =>
              onChange(items.map((entry, position) => (position === index ? event.target.value : entry)))
            }
            className="min-w-0 flex-1 rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <IconButton
            label="Supprimer cette entrée"
            destructive
            onClick={() => onChange(items.filter((_, position) => position !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une entrée
      </button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "rounded-sm p-1.5 text-foreground/50 transition-colors disabled:opacity-25",
        destructive ? "hover:text-destructive" : "hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
