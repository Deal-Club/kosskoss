"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { RichTextField } from "@/components/admin/RichTextField";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { cn } from "@/lib/utils";
import {
  BLOCK_LABELS,
  BLOCK_KINDS,
  CALLOUT_TONES,
  VIDEO_PROVIDERS,
  type BlockKind,
  type JournalBlock,
} from "@/types/journal";

/**
 * Éditeur de blocs.
 *
 * Ce n'est délibérément PAS un éditeur WYSIWYG. Un éditeur riche produit du
 * HTML : il faudrait alors le stocker, le nettoyer à l'affichage, et espérer que
 * le nettoyage suive les prochaines trouvailles d'injection. Ici, chaque bloc
 * est une donnée typée, le texte porte trois marques (`**gras**`, `*italique*`,
 * `[texte](lien)`) et le rendu passe par des composants React. On échange un
 * peu de confort de saisie contre l'impossibilité structurelle d'injecter du
 * code — et contre un contenu qui reste lisible, diffable et réaffichable
 * autrement (fil RSS, application mobile) sans démêler du balisage.
 *
 * Ajouter un type de bloc coûte : une entrée dans `emptyBlock`, un cas dans
 * `BlockFields`. Le reste — ordre, suppression, repli — est générique.
 */

const inputClass =
  "w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "block text-xs font-bold tracking-wide text-muted-foreground uppercase";

/** Bloc neuf, avec des valeurs qui passent la validation dès l'ajout. */
function emptyBlock(kind: BlockKind): JournalBlock {
  switch (kind) {
    case "paragraph":
      return { kind, text: "" };
    case "heading":
      return { kind, level: 2, text: "" };
    case "list":
      return { kind, ordered: false, items: [""] };
    case "quote":
      return { kind, text: "", attribution: "" };
    case "image":
      return { kind, src: "", alt: "", caption: "" };
    case "gallery":
      return { kind, items: [] };
    case "video":
      return { kind, provider: "youtube", videoId: "", title: "" };
    case "callout":
      return { kind, tone: "info", title: "", text: "" };
    case "stats":
      return { kind, items: [{ value: "", label: "" }] };
    case "cta":
      return { kind, title: "", text: "", href: "/", label: "" };
    case "productCard":
      return { kind, title: "", slugs: [] };
    case "newsletter":
      return { kind, title: "", text: "" };
    case "faq":
      return { kind, items: [{ question: "", answer: "" }] };
    case "table":
      return { kind, headers: ["", ""], rows: [["", ""]] };
    case "divider":
      return { kind };
  }
}

/** Résumé d'un bloc replié, pour s'y retrouver sans tout déplier. */
function summarize(block: JournalBlock): string {
  switch (block.kind) {
    case "paragraph":
    case "quote":
    case "heading":
      return block.text.slice(0, 70) || "—";
    case "list":
      return block.items.filter(Boolean).join(" · ").slice(0, 70) || "—";
    case "image":
      return block.alt || block.src || "—";
    case "gallery":
      return `${block.items.length} image${block.items.length > 1 ? "s" : ""}`;
    case "video":
      return block.title || block.videoId || "—";
    case "callout":
      return block.title || block.text.slice(0, 70) || "—";
    case "stats":
      return block.items.map((item) => item.value).filter(Boolean).join(" · ") || "—";
    case "cta":
      return block.label || block.href;
    case "productCard":
      return block.slugs.join(", ") || "—";
    case "newsletter":
      return block.title || "Bloc newsletter";
    case "faq":
      return `${block.items.length} question${block.items.length > 1 ? "s" : ""}`;
    case "table":
      return block.headers.filter(Boolean).join(" · ") || "—";
    case "divider":
      return "—";
  }
}

// ---- Champs par type de bloc ----

function TextList({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-2 space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={value}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...values];
                next[index] = event.target.value;
                onChange(next);
              }}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, position) => position !== index))}
              className="shrink-0 rounded-sm border border-border px-2 text-muted-foreground hover:border-destructive hover:text-destructive"
              aria-label={`Supprimer l'entrée ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="mt-2 text-xs font-bold text-primary hover:underline"
      >
        + Ajouter une entrée
      </button>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: JournalBlock;
  onChange: (block: JournalBlock) => void;
}) {
  switch (block.kind) {
    case "paragraph":
      return (
        <RichTextField
          label="Texte"
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          rows={5}
          hint="**gras**, *italique*, [texte](/lien)"
        />
      );

    case "heading":
      return (
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <label className="block">
            <span className={labelClass}>Niveau</span>
            <select
              value={block.level}
              onChange={(event) =>
                onChange({ ...block, level: event.target.value === "3" ? 3 : 2 })
              }
              className={cn(inputClass, "mt-1")}
            >
              <option value={2}>Titre (H2)</option>
              <option value={3}>Sous-titre (H3)</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Intitulé</span>
            <input
              value={block.text}
              onChange={(event) => onChange({ ...block, text: event.target.value })}
              className={cn(inputClass, "mt-1")}
            />
          </label>
        </div>
      );

    case "list":
      return (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.ordered}
              onChange={(event) => onChange({ ...block, ordered: event.target.checked })}
            />
            Liste numérotée
          </label>
          <TextList
            label="Entrées"
            values={block.items}
            onChange={(items) => onChange({ ...block, items })}
          />
        </div>
      );

    case "quote":
      return (
        <div className="space-y-4">
          <RichTextField
            label="Citation"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={3}
          />
          <label className="block">
            <span className={labelClass}>Attribution</span>
            <input
              value={block.attribution}
              onChange={(event) => onChange({ ...block, attribution: event.target.value })}
              className={cn(inputClass, "mt-1")}
              placeholder="Aline N., esthéticienne"
            />
          </label>
        </div>
      );

    case "image":
      return (
        <div className="space-y-4">
          <ImageUploadField
            label="Image"
            value={block.src}
            onChange={(src) => onChange({ ...block, src })}
          />
          <label className="block">
            <span className={labelClass}>Texte alternatif (obligatoire)</span>
            <input
              value={block.alt}
              onChange={(event) => onChange({ ...block, alt: event.target.value })}
              className={cn(inputClass, "mt-1")}
              placeholder="Ce que montre l'image, pour qui ne la voit pas"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Légende</span>
            <input
              value={block.caption}
              onChange={(event) => onChange({ ...block, caption: event.target.value })}
              className={cn(inputClass, "mt-1")}
            />
          </label>
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          {block.items.map((item, index) => (
            <div key={index} className="rounded-sm border border-border p-3">
              <ImageUploadField
                label={`Image ${index + 1}`}
                value={item.src}
                onChange={(src) => {
                  const items = [...block.items];
                  items[index] = { ...items[index], src };
                  onChange({ ...block, items });
                }}
              />
              <label className="mt-2 block">
                <span className={labelClass}>Texte alternatif</span>
                <input
                  value={item.alt}
                  onChange={(event) => {
                    const items = [...block.items];
                    items[index] = { ...items[index], alt: event.target.value };
                    onChange({ ...block, items });
                  }}
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
                }
                className="mt-2 text-xs font-bold text-destructive hover:underline"
              >
                Retirer cette image
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...block, items: [...block.items, { src: "", alt: "" }] })}
            className="text-xs font-bold text-primary hover:underline"
          >
            + Ajouter une image
          </button>
        </div>
      );

    case "video":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Plateforme</span>
            <select
              value={block.provider}
              onChange={(event) =>
                onChange({ ...block, provider: event.target.value as (typeof VIDEO_PROVIDERS)[number] })
              }
              className={cn(inputClass, "mt-1")}
            >
              {VIDEO_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider === "youtube" ? "YouTube" : "Vimeo"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Identifiant de la vidéo</span>
            <input
              value={block.videoId}
              onChange={(event) => onChange({ ...block, videoId: event.target.value })}
              className={cn(inputClass, "mt-1")}
              placeholder="dQw4w9WgXcQ"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              L&apos;identifiant seul, pas l&apos;adresse complète : c&apos;est ce qui garantit que
              seule la plateforme choisie est intégrée.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Titre</span>
            <input
              value={block.title}
              onChange={(event) => onChange({ ...block, title: event.target.value })}
              className={cn(inputClass, "mt-1")}
            />
          </label>
        </div>
      );

    case "callout":
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Tonalité</span>
              <select
                value={block.tone}
                onChange={(event) =>
                  onChange({ ...block, tone: event.target.value as (typeof CALLOUT_TONES)[number] })
                }
                className={cn(inputClass, "mt-1")}
              >
                <option value="info">Information</option>
                <option value="conseil">Conseil</option>
                <option value="avertissement">Avertissement</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Titre</span>
              <input
                value={block.title}
                onChange={(event) => onChange({ ...block, title: event.target.value })}
                className={cn(inputClass, "mt-1")}
              />
            </label>
          </div>
          <RichTextField
            label="Texte"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={3}
          />
        </div>
      );

    case "stats":
      return (
        <div className="space-y-3">
          {block.items.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <input
                value={item.value}
                placeholder="48 h"
                onChange={(event) => {
                  const items = [...block.items];
                  items[index] = { ...items[index], value: event.target.value };
                  onChange({ ...block, items });
                }}
                className={inputClass}
              />
              <input
                value={item.label}
                placeholder="d'hydratation mesurée"
                onChange={(event) => {
                  const items = [...block.items];
                  items[index] = { ...items[index], label: event.target.value };
                  onChange({ ...block, items });
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
                }
                className="rounded-sm border border-border px-2 text-muted-foreground hover:border-destructive hover:text-destructive"
                aria-label={`Supprimer le chiffre ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...block, items: [...block.items, { value: "", label: "" }] })}
            className="text-xs font-bold text-primary hover:underline"
          >
            + Ajouter un chiffre
          </button>
          <p className="text-xs text-muted-foreground">
            N&apos;affichez ici que des chiffres que vous pouvez justifier : un chiffre inventé sur
            une page publique engage la boutique.
          </p>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>Titre</span>
            <input
              value={block.title}
              onChange={(event) => onChange({ ...block, title: event.target.value })}
              className={cn(inputClass, "mt-1")}
            />
          </label>
          <RichTextField
            label="Texte"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={2}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Lien</span>
              <input
                value={block.href}
                onChange={(event) => onChange({ ...block, href: event.target.value })}
                className={cn(inputClass, "mt-1")}
                placeholder="/diagnostic"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Libellé du bouton</span>
              <input
                value={block.label}
                onChange={(event) => onChange({ ...block, label: event.target.value })}
                className={cn(inputClass, "mt-1")}
                placeholder="Faire le diagnostic"
              />
            </label>
          </div>
        </div>
      );

    case "productCard":
      return (
        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>Titre du bloc</span>
            <input
              value={block.title}
              onChange={(event) => onChange({ ...block, title: event.target.value })}
              className={cn(inputClass, "mt-1")}
              placeholder="Notre sélection"
            />
          </label>
          <TextList
            label="Slugs produits"
            values={block.slugs}
            onChange={(slugs) => onChange({ ...block, slugs })}
            placeholder="serum-eclat-vitamine-c"
          />
          <p className="text-xs text-muted-foreground">
            Le prix, le stock et le visuel sont lus dans le catalogue au moment de l&apos;affichage :
            un produit dont le tarif change n&apos;oblige pas à rouvrir l&apos;article.
          </p>
        </div>
      );

    case "newsletter":
      return (
        <p className="text-sm text-muted-foreground">
          Ce bloc insère le formulaire d&apos;inscription de la boutique. Il n&apos;a pas de réglage :
          il reprend le texte et le comportement du bandeau déjà utilisé en pied de page.
        </p>
      );

    case "faq":
      return (
        <div className="space-y-3">
          {block.items.map((item, index) => (
            <div key={index} className="rounded-sm border border-border p-3">
              <label className="block">
                <span className={labelClass}>Question</span>
                <input
                  value={item.question}
                  onChange={(event) => {
                    const items = [...block.items];
                    items[index] = { ...items[index], question: event.target.value };
                    onChange({ ...block, items });
                  }}
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <div className="mt-3">
                <RichTextField
                  label="Réponse"
                  value={item.answer}
                  onChange={(answer) => {
                    const items = [...block.items];
                    items[index] = { ...items[index], answer };
                    onChange({ ...block, items });
                  }}
                  rows={3}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
                }
                className="mt-2 text-xs font-bold text-destructive hover:underline"
              >
                Retirer cette question
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })
            }
            className="text-xs font-bold text-primary hover:underline"
          >
            + Ajouter une question
          </button>
        </div>
      );

    case "table":
      return (
        <div className="space-y-4">
          <TextList
            label="En-têtes de colonnes"
            values={block.headers}
            onChange={(headers) => {
              // Les lignes suivent le nombre de colonnes : sans ça, le tableau
              // partirait de travers dès qu'on ajoute une colonne.
              const rows = block.rows.map((row) => headers.map((_, index) => row[index] ?? ""));
              onChange({ ...block, headers, rows });
            }}
          />
          <div className="space-y-2">
            <span className={labelClass}>Lignes</span>
            {block.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                {row.map((cell, cellIndex) => (
                  <input
                    key={cellIndex}
                    value={cell}
                    onChange={(event) => {
                      const rows = block.rows.map((current) => [...current]);
                      rows[rowIndex][cellIndex] = event.target.value;
                      onChange({ ...block, rows });
                    }}
                    className={inputClass}
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...block, rows: block.rows.filter((_, i) => i !== rowIndex) })
                  }
                  className="shrink-0 rounded-sm border border-border px-2 text-muted-foreground hover:border-destructive hover:text-destructive"
                  aria-label={`Supprimer la ligne ${rowIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] })
              }
              className="text-xs font-bold text-primary hover:underline"
            >
              + Ajouter une ligne
            </button>
          </div>
        </div>
      );

    case "divider":
      return <p className="text-sm text-muted-foreground">Trait de séparation. Aucun réglage.</p>;
  }
}

// ---- Éditeur ----

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: JournalBlock[];
  onChange: (blocks: JournalBlock[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const [adding, setAdding] = useState(false);

  function update(index: number, block: JournalBlock) {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setOpen(target);
  }

  function remove(index: number) {
    onChange(blocks.filter((_, position) => position !== index));
    setOpen(null);
  }

  function add(kind: BlockKind) {
    onChange([...blocks, emptyBlock(kind)]);
    setOpen(blocks.length);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const expanded = open === index;
        return (
          <div key={index} className="rounded-sm border border-border bg-white">
            <div className="flex items-center gap-2 px-3 py-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setOpen(expanded ? null : index)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-expanded={expanded}
              >
                <span className="shrink-0 rounded-sm bg-muted px-2 py-0.5 text-[11px] font-bold tracking-wide text-foreground uppercase">
                  {BLOCK_LABELS[block.kind]}
                </span>
                <span className="truncate text-sm text-muted-foreground">{summarize(block)}</span>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Monter le bloc"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Descendre le bloc"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-sm p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer le bloc"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className="border-t border-border p-4">
                <BlockFields block={block} onChange={(next) => update(index, next)} />
              </div>
            ) : null}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-sm border border-dashed border-border p-4">
          <p className={labelClass}>Ajouter un bloc</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BLOCK_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => add(kind)}
                className="rounded-sm border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
              >
                {BLOCK_LABELS[kind]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-3 text-xs text-muted-foreground hover:underline"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border py-3 text-sm font-bold text-primary hover:border-primary"
        >
          <Plus className="h-4 w-4" />
          Ajouter un bloc
        </button>
      )}
    </div>
  );
}
