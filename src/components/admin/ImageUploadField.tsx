"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
}

interface UploadResponse {
  path?: string;
  url?: string;
  storage?: "cloudinary" | "local";
  error?: string;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";

/**
 * Le champ accepte deux formes de valeur : un chemin interne (« /uploads/… »,
 * « /images/… ») ou une URL absolue, typiquement celle renvoyée par Cloudinary.
 * next/image refuse tout le reste (chemin relatif sans barre oblique de tête),
 * on filtre donc avant de tenter l'aperçu.
 */
function isDisplayableSource(value: string): boolean {
  if (value.startsWith("/")) return true;
  return /^https?:\/\//i.test(value);
}

export function ImageUploadField({
  value,
  onChange,
  label = "Image du produit",
  hint = "Laisser vide pour utiliser l'image de la catégorie.",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Plutôt qu'un booléen, on mémorise le chemin en erreur : l'aperçu se réinitialise
  // ainsi de lui-même au changement de valeur, sans aucun useEffect.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  // Chemin enregistré en local faute de clés Cloudinary : on garde la valeur
  // concernée pour que l'avertissement disparaisse dès que le champ change.
  const [localFallbackSrc, setLocalFallbackSrc] = useState<string | null>(null);

  const trimmed = value.trim();
  const showPreview =
    trimmed.length > 0 && isDisplayableSource(trimmed) && brokenSrc !== trimmed;
  const showLocalWarning = localFallbackSrc !== null && localFallbackSrc === trimmed;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permet de resélectionner le même fichier
    event.target.value = "";
    if (!file) return;

    setError(null);
    setPending(true);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as UploadResponse | null;
      const uploaded = data?.url ?? data?.path;

      if (!response.ok || !uploaded) {
        setError(data?.error ?? "L'envoi a échoué.");
        return;
      }
      setLocalFallbackSrc(data?.storage === "local" ? uploaded : null);
      onChange(uploaded);
    } catch {
      setError("L'envoi a échoué. Merci de réessayer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-4 text-sm">
      <span className="mb-1 block font-semibold text-foreground">{label}</span>

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
          {showPreview ? (
            <Image
              key={trimmed}
              src={trimmed}
              alt="Aperçu"
              fill
              sizes="96px"
              className="object-contain"
              onError={() => setBrokenSrc(trimmed)}
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
              {trimmed ? "Aperçu indisponible" : "Aucune image"}
            </span>
          )}
        </div>

        <div className="flex-1">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/images/products/…, /uploads/… ou https://res.cloudinary.com/…"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="rounded-sm border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary disabled:opacity-60"
            >
              {pending ? "Envoi en cours…" : "Envoyer une image"}
            </button>
            {trimmed && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Retirer
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              JPG, PNG, WebP ou AVIF — 5 Mo maximum.
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          {showLocalWarning && (
            <p className="mt-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Stockage local de secours utilisé : les clés Cloudinary ne sont pas
              renseignées. Les images locales disparaissent à chaque déploiement — définissez
              CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans
              l&apos;environnement du serveur, puis renvoyez l&apos;image.
            </p>
          )}
          {error && <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
