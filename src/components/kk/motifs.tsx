/**
 * Motifs graphiques KossKoss Select — SVG inline, sans dépendance ni image.
 * Servent de signature de marque (monogramme KK encadré de la charte),
 * de placeholders produit élégants et de décors organiques.
 */

/** Monogramme KK encadré, repris du logo de la charte. */
export function Monogram({
  className,
  title = "KossKoss Select",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title}>
      <rect x="6" y="6" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="74" height="74" fill="currentColor" opacity="0.06" />
      {/* K gauche */}
      <path
        d="M30 30 V70 M30 50 L48 30 M30 50 L48 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* K droit (miroir doux) */}
      <path
        d="M52 30 L70 50 L52 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Flacon de soin stylisé, pour les visuels produit placeholder. */
export function BottleMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 160" className={className} aria-hidden="true">
      <rect x="50" y="10" width="20" height="16" rx="3" fill="currentColor" opacity="0.55" />
      <path
        d="M44 26 h32 a6 6 0 0 1 6 6 v104 a10 10 0 0 1 -10 10 h-30 a10 10 0 0 1 -10 -10 v-104 a6 6 0 0 1 6 -6 z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M44 26 h32 a6 6 0 0 1 6 6 v104 a10 10 0 0 1 -10 10 h-30 a10 10 0 0 1 -10 -10 v-104 a6 6 0 0 1 6 -6 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.5"
      />
      <line x1="44" y1="58" x2="76" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="60" cy="98" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}

/** Pétale / feuille organique — décor du bloc diagnostic. */
export function Petal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        d="M100 8 C150 40 180 90 172 140 C168 168 140 192 100 192 C60 192 32 168 28 140 C20 90 50 40 100 8 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M100 24 C100 80 100 130 100 180"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path
        d="M100 70 C124 62 146 66 160 82 M100 110 C126 104 150 108 164 124"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="1.5"
        opacity="0.45"
      />
    </svg>
  );
}

/** Filet ondulé fin — signature discrète des arrière-plans. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 120" className={className} aria-hidden="true" fill="none">
      <path
        d="M0 60 C80 10 120 110 200 60 C280 10 320 110 400 60"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M0 80 C80 30 120 130 200 80 C280 30 320 130 400 80"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
    </svg>
  );
}
