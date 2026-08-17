"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";

/**
 * Partage d'un article.
 *
 * Des liens `share` bruts, aucun SDK tiers : les widgets officiels de Facebook
 * ou de X chargent plusieurs centaines de kilo-octets et déposent des traceurs
 * sur toutes les pages où ils se trouvent. Une adresse suffit à ouvrir la même
 * fenêtre de partage.
 *
 * WhatsApp figure en premier : c'est le canal de partage dominant sur le marché
 * camerounais, et le site porte déjà un bouton WhatsApp flottant.
 */

/**
 * Logos de marque dessinés ici.
 *
 * lucide-react v1 a retiré ses icônes de marque (contraintes d'usage des
 * chartes), et installer un paquet d'icônes entier pour trois glyphes serait
 * disproportionné. Ce sont trois tracés, ils ne bougeront plus.
 */

type Glyph = ({ className }: { className?: string }) => React.ReactElement;

const FacebookIcon: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
  </svg>
);

const LinkedinIcon: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.83v1.64h.05c.53-.96 1.83-1.98 3.77-1.98 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.72c0-1.37-.03-3.13-1.98-3.13-1.99 0-2.29 1.49-2.29 3.03V21H9z" />
  </svg>
);

const XIcon: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ShareTarget {
  label: string;
  icon: Glyph | typeof MessageCircle;
  href: (url: string, title: string) => string;
}

const TARGETS: ShareTarget[] = [
  {
    label: "WhatsApp",
    icon: MessageCircle,
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    label: "Facebook",
    icon: FacebookIcon,
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: "LinkedIn",
    icon: LinkedinIcon,
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

export function ShareButtons({
  url,
  title,
  locale,
}: {
  url: string;
  title: string;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Le presse-papiers peut être refusé (contexte non sécurisé, permission) :
      // l'adresse reste visible et sélectionnable dans la barre du navigateur.
    }
  }

  const buttonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-deep transition hover:border-deep hover:bg-cream focus-visible:ring-2 focus-visible:ring-deep focus-visible:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">
        {locale === "en" ? "Share" : "Partager"}
      </span>

      {TARGETS.map((target) => {
        const Icon = target.icon;
        return (
          <a
            key={target.label}
            href={target.href(url, title)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
            aria-label={`${locale === "en" ? "Share on" : "Partager sur"} ${target.label}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </a>
        );
      })}

      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label={locale === "en" ? "Share on X" : "Partager sur X"}
      >
        <XIcon className="h-3.5 w-3.5" />
      </a>

      <button type="button" onClick={copy} className={buttonClass} aria-label={locale === "en" ? "Copy link" : "Copier le lien"}>
        {copied ? (
          <Check className="h-4 w-4 text-trust" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {/* Retour lisible par un lecteur d'écran : l'icône seule ne dit rien. */}
      <span aria-live="polite" className="sr-only">
        {copied ? (locale === "en" ? "Link copied" : "Lien copié") : ""}
      </span>
    </div>
  );
}
