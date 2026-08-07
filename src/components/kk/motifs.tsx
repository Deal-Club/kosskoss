/**
 * Motifs graphiques KossKoss Select — SVG inline, sans dépendance ni image.
 * Servent de signature de marque (monogramme KK encadré de la charte),
 * de placeholders produit élégants et de décors organiques.
 */

/**
 * Tracé du monogramme : le bloc plein, puis les deux K en sous-tracés que
 * `evenodd` transforme en évidements. Exporté parce que l'écran d'attente
 * anime ce même tracé — une seule définition du sigle, pas deux qui divergent.
 */
export const KK_MONOGRAM_PATH =
  "M37 37H495V495H37ZM123.0 387.1C123.0 385.6 124.0 385.1 128.9 384.6C136.6 383.7 142.9 379.7 146.7 373.3L149.5 368.5L149.8 268.2C150.0 202.3 149.7 166.6 149.0 164.1C147.6 158.7 142.7 152.4 138.1 150.0C135.9 148.9 131.6 147.7 128.6 147.4C124.0 146.8 123.0 146.4 123.0 144.9C123.0 143.0 124.4 143.0 161.2 143.2C196.7 143.5 199.5 143.6 199.8 145.2C200.1 146.6 199.5 147.0 197.0 147.0C187.7 147.0 178.4 152.7 174.9 160.4C173.1 164.3 173.0 169.5 173.0 266.0C173.0 362.5 173.1 367.7 174.9 371.6C178.4 379.3 187.7 385.0 197.0 385.0C199.5 385.0 200.1 385.4 199.8 386.8C199.5 388.4 196.7 388.5 161.2 388.8C124.4 389.0 123.0 389.0 123.0 387.1ZM310.9 388.0C306.7 387.6 300.8 386.7 297.9 386.0C289.8 384.1 279.1 378.8 273.8 374.1C266.1 367.3 183.8 267.2 184.7 265.7C185.1 265.1 204.0 241.2 226.6 212.8C249.3 184.4 268.1 160.2 268.5 159.0C270.4 152.9 265.2 147.0 257.7 147.0C254.6 147.0 253.9 146.7 254.2 145.2C254.5 143.6 257.2 143.5 291.3 143.2C327.5 143.0 328.0 143.0 328.0 145.0C328.0 146.6 327.3 147.0 324.6 147.0C313.6 147.0 301.2 152.1 292.7 160.1C289.6 163.1 269.1 186.4 247.1 211.9L207.1 258.3L209.3 260.9C253.5 313.2 302.7 370.4 305.9 373.3C311.6 378.4 320.6 382.6 329.2 384.0C334.7 385.0 336.0 385.5 335.8 386.8C335.5 388.2 334.0 388.5 327.0 388.6C322.3 388.7 315.1 388.4 310.9 388.0ZM395.9 387.9C383.8 386.9 372.7 383.3 363.9 377.4C358.0 373.5 352.0 366.6 313.2 319.9L269.2 266.7L276.8 257.1C281.0 251.8 297.7 230.8 314.0 210.5C355.2 159.0 354.0 160.6 354.0 156.0C354.0 150.9 349.7 147.0 343.9 147.0C340.7 147.0 340.0 146.7 340.0 145.0C340.0 143.0 340.5 143.0 376.7 143.2C409.6 143.5 413.5 143.7 413.8 145.1C414.0 146.4 412.9 146.8 407.6 147.2C398.5 148.0 389.2 151.5 382.1 156.9C378.3 159.9 361.5 178.5 334.8 209.4C312.1 235.8 293.5 257.9 293.6 258.5C293.7 259.1 315.4 285.1 341.8 316.2C376.6 357.1 391.4 373.7 395.2 376.3C400.7 380.1 410.3 384.0 414.2 384.0C418.5 384.0 421.0 385.2 421.0 387.1C421.0 388.8 420.2 389.0 413.2 388.9C409.0 388.8 401.2 388.4 395.9 387.9Z";

/**
 * Monogramme KK — le sigle de la marque, vectorisé depuis
 * `assets/marque/kk-monogramme.png` (le fichier qui sert aussi de favicon).
 *
 * Trois éléments : un filet extérieur, une réserve, un bloc plein dont les
 * deux K sont évidés. Les lettres sont des TROUS et non des formes blanches —
 * le fond de la page transparaît donc à travers, et le sigle se pose aussi
 * bien sur crème que sur le bleu du pied de page.
 *
 * Le tracé est un seul `path` en `evenodd` plutôt qu'un `mask` : pas
 * d'identifiant à rendre unique, donc pas de collision quand plusieurs
 * monogrammes cohabitent, et le composant reste rendu côté serveur.
 */
export function Monogram({
  className,
  title = "KossKoss Select",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox="0 0 532 532" className={className} role="img" aria-label={title}>
      <rect
        x="2.5"
        y="2.5"
        width="527"
        height="527"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
      />
      <path fill="currentColor" fillRule="evenodd" d={KK_MONOGRAM_PATH} />
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
