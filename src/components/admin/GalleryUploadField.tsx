"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";

// Vues complémentaires de la fiche produit.
//
// L'image principale reste gérée par ImageUploadField : c'est elle qui sert de
// vignette partout ailleurs (listes, panier, flux Google). Ce champ-ci ne gère
// que les vues supplémentaires, dans l'ordre où elles apparaîtront sous l'image
// principale. L'envoi passe par la même route que l'image principale.

interface UploadResponse {
  path?: string;
  url?: string;
  storage?: "cloudinary" | "local";
  error?: string;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";

interface GalleryUploadFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Reprend GALLERY_IMAGES_MAX côté serveur : le formulaire refuse avant l'aller-retour. */
  max?: number;
}

export function GalleryUploadField({ value, onChange, max = 8 }: GalleryUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState("");

  const full = value.length >= max;

  function add(path: string) {
    const trimmed = path.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setError("Cette image est déjà dans la galerie.");
      return;
    }
    if (value.length >= max) {
      setError(`La galerie accepte au maximum ${max} images.`);
      return;
    }
    setError(null);
    onChange([...value, trimmed]);
  }

  function removeAt(index: number) {
    setError(null);
    onChange(value.filter((_, position) => position !== index));
  }

  /** Déplace une image d'un cran ; l'ordre du tableau est celui de la galerie. */
  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const moved = next[index];
    next[index] = next[target];
    next[target] = moved;
    onChange(next);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Permet de resélectionner les mêmes fichiers
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setPending(true);

    // Les envois se suivent : la route d'upload traite un fichier à la fois et
    // l'ordre de la galerie doit rester celui de la sélection.
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        if (value.length + uploaded.length >= max) {
          setError(`La galerie accepte au maximum ${max} images.`);
          break;
        }

        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const data = (await response.json().catch(() => null)) as UploadResponse | null;
        const path = data?.url ?? data?.path;

        if (!response.ok || !path) {
          setError(data?.error ?? "L'envoi a échoué.");
          break;
        }
        if (!value.includes(path) && !uploaded.includes(path)) uploaded.push(path);
      }
    } catch {
      setError("L'envoi a échoué. Merci de réessayer.");
    } finally {
      setPending(false);
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    }
  }

  return (
    <div className="mb-4 text-sm">
      <span className="mb-1 block font-semibold text-foreground">
        Galerie ({value.length}/{max})
      </span>
      <p className="mb-2 text-xs text-muted-foreground">
        Vues supplémentaires affichées sous l&apos;image principale, dans cet ordre. La première
        image de la fiche reste l&apos;image principale ci-dessus.
      </p>

      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((src, index) => (
            <li
              key={src}
              className="group relative h-20 w-20 overflow-hidden rounded-sm border border-border bg-muted"
            >
              <Image
                src={src}
                alt={`Vue ${index + 1}`}
                fill
                sizes="80px"
                className="object-contain"
                unoptimized
              />

              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Retirer la vue ${index + 1}`}
                title={`Retirer la vue ${index + 1}`}
                className="absolute top-0.5 right-0.5 rounded-sm bg-white/90 p-0.5 text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <span className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Déplacer la vue ${index + 1} vers la gauche`}
                  className="p-0.5 text-foreground disabled:opacity-30"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label={`Déplacer la vue ${index + 1} vers la droite`}
                  className="p-0.5 text-foreground disabled:opacity-30"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending || full}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {pending ? "Envoi en cours…" : "Ajouter des images"}
        </button>

        <span className="text-xs text-muted-foreground">ou</span>

        <input
          value={manualPath}
          onChange={(event) => setManualPath(event.target.value)}
          onKeyDown={(event) => {
            // Entrée valide le chemin sans envoyer le formulaire produit
            if (event.key !== "Enter") return;
            event.preventDefault();
            add(manualPath);
            setManualPath("");
          }}
          placeholder="/images/products/… ou https://…"
          disabled={full}
          className="min-w-48 flex-1 rounded-sm border border-border px-3 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => {
            add(manualPath);
            setManualPath("");
          }}
          disabled={full || !manualPath.trim()}
          className="rounded-sm border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {full && (
        <p className="mt-1 text-xs text-muted-foreground">
          Maximum atteint. Retirez une image pour en ajouter une autre.
        </p>
      )}
      {error && <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
