"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCents } from "@/lib/cart";
import { useRecentlyViewed } from "@/lib/recentlyViewed";

// Ne se déclenche pas avant ce délai après le chargement : sans lui, un
// visiteur dont le curseur passe par hasard près du haut de l'écran juste
// après l'arrivée verrait le popup avant d'avoir rien regardé.
const ARM_DELAY_MS = 4000;

// Aperçu du popup : au-delà, la carte devient un mur de vignettes au lieu
// d'un rappel ciblé. La page dédiée, elle, montre tout l'historique.
const PREVIEW_LIMIT = 3;

const SHOWN_ONCE_KEY = "mlc.exitIntent.shown.v1";

function alreadyShownThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SHOWN_ONCE_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.sessionStorage.setItem(SHOWN_ONCE_KEY, "1");
  } catch {
    // Navigation privée : le popup pourra réapparaître une fois — sans gravité.
  }
}

/**
 * Popup de sortie : au moment où la souris quitte la fenêtre par le haut
 * (barre d'onglets, barre d'adresse), rappelle les produits consultés
 * pendant la session plutôt que de laisser le visiteur partir sans réponse.
 *
 * Repose sur un geste de souris : il ne peut donc rien détecter sur mobile ou
 * tablette, où ce signal n'existe pas. C'est une limite connue et acceptée du
 * procédé, pas un oubli.
 */
export function ExitIntentPopup() {
  const t = useTranslations("exitIntent");
  const { items, ready } = useRecentlyViewed();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const armable = ready && items.length > 0;

  useEffect(() => {
    if (!armable || alreadyShownThisSession()) return;

    let armed = false;
    const timer = window.setTimeout(() => {
      armed = true;
    }, ARM_DELAY_MS);

    function handleMouseOut(event: MouseEvent) {
      // relatedTarget reste nul uniquement quand le curseur quitte le
      // document par un bord de la fenêtre — pas en survolant un élément.
      if (!armed || event.relatedTarget !== null || event.clientY > 0) return;
      setOpen(true);
      markShown();
    }

    document.addEventListener("mouseout", handleMouseOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [armable]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const preview = items.slice(0, PREVIEW_LIMIT);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-secondary/70"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-intent-title"
        className="animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl duration-200"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="exit-intent-title" className="pr-8 font-heading text-xl font-black text-foreground">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("subtitle", { count: items.length })}
        </p>

        <ul className="mt-5 flex flex-col gap-3">
          {preview.map((item) => (
            <li key={item.productId}>
              <Link
                href={item.path}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-sm border border-border p-2 transition-colors hover:border-primary/50 hover:bg-muted"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
                  {item.image && (
                    <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {item.name}
                  </span>
                  <span className="messwert block text-sm font-black text-primary">
                    {formatCents(item.priceCents)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/vus-recemment"
          onClick={() => setOpen(false)}
          className="mt-5 flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 font-heading text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
        >
          {t("cta")}
        </Link>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
