"use client";

import { useId, useRef, useState } from "react";
import { Bold, Italic, Link2 } from "lucide-react";
import { RichText } from "@/components/RichText";
import { isSafeHref, paragraphsOf } from "@/lib/richText";
import { cn } from "@/lib/utils";

/**
 * Champ de texte avec mise en forme, pour les pages légales.
 *
 * La barre d'outils insère des marques dans le texte (`**gras**`, `*italique*`,
 * `[libellé](lien)`) plutôt que de manipuler du HTML : ce qui est enregistré
 * reste du texte, lisible et diffable, et le rendu public passe par le même
 * composant `RichText` que l'aperçu affiché ici — ce que voit l'administrateur
 * est donc exactement ce que verra un client.
 *
 * L'aperçu n'apparaît que si le texte contient une marque. Sur un champ sans
 * mise en forme, il n'apprendrait rien et doublerait la hauteur du formulaire.
 */

const MARKS = /\*\*|\*|\[[^\]]*\]\(/;

type Mark = "strong" | "em" | "link";

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Champ d'une seule ligne (titre de page, titre de section, entrée de liste). */
  singleLine?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export function RichTextField({
  label,
  value,
  onChange,
  singleLine = false,
  rows = 6,
  placeholder,
  hint,
  required = false,
}: RichTextFieldProps) {
  const fieldId = useId();
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  function applyMark(mark: Mark) {
    const field = ref.current;
    if (!field) return;

    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? start;
    const selected = value.slice(start, end);

    let opening: string;
    let closing: string;

    if (mark === "link") {
      const href = window.prompt(
        "Adresse du lien\n\nExemples : /cgv, https://exemple.fr, mailto:contact@mlc-bois.fr",
        "https://",
      );
      if (href === null) return;
      if (!isSafeHref(href)) {
        setLinkError(
          "Adresse refusée. Seuls les chemins internes (/cgv), http(s)://, mailto: et tel: sont acceptés.",
        );
        return;
      }
      setLinkError(null);
      opening = "[";
      closing = `](${href.trim()})`;
    } else {
      opening = mark === "strong" ? "**" : "*";
      closing = opening;
    }

    // Deuxième clic sur un passage déjà marqué : on retire la marque au lieu
    // de l'empiler.
    if (
      mark !== "link" &&
      selected.length > opening.length * 2 &&
      selected.startsWith(opening) &&
      selected.endsWith(closing)
    ) {
      const stripped = selected.slice(opening.length, selected.length - closing.length);
      onChange(value.slice(0, start) + stripped + value.slice(end));
      restoreSelection(start, start + stripped.length);
      return;
    }

    // Sans sélection, on pose un mot d'exemple : le rédacteur voit tout de
    // suite où écrire plutôt qu'un curseur perdu entre deux astérisques.
    const inner = selected || (mark === "link" ? "Linktext" : "Text");
    onChange(value.slice(0, start) + opening + inner + closing + value.slice(end));
    restoreSelection(start + opening.length, start + opening.length + inner.length);
  }

  function restoreSelection(from: number, to: number) {
    // Le champ est contrôlé : la nouvelle valeur n'est posée qu'au rendu
    // suivant, d'où le report.
    requestAnimationFrame(() => {
      const field = ref.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(from, to);
    });
  }

  const showPreview = MARKS.test(value);
  const commonProps = {
    id: fieldId,
    value,
    placeholder,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    className:
      "w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary",
  };

  return (
    <div className="mb-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>

        <div className="flex items-center gap-1">
          <ToolbarButton label="Gras" onClick={() => applyMark("strong")}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Italique" onClick={() => applyMark("em")}>
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Insérer un lien" onClick={() => applyMark("link")}>
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      </div>

      {singleLine ? (
        <input {...commonProps} ref={ref as React.RefObject<HTMLInputElement>} type="text" />
      ) : (
        <textarea
          {...commonProps}
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          rows={rows}
          className={cn(commonProps.className, "resize-y leading-relaxed")}
        />
      )}

      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {linkError && <p className="mt-1 text-xs font-semibold text-destructive">{linkError}</p>}

      {showPreview && (
        <div className="mt-2 rounded-sm border border-dashed border-border bg-muted/60 px-3 py-2">
          <p className="mb-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
            Aperçu
          </p>
          {paragraphsOf(value).map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 24)}`}
              className="mb-1.5 text-sm leading-relaxed text-foreground/80 last:mb-0"
            >
              <RichText text={paragraph} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-sm border border-border bg-white px-2 py-1 text-foreground/70 transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </button>
  );
}
