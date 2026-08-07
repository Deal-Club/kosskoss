import { KK_MONOGRAM_PATH } from "./motifs";

/**
 * Écran d'attente de la boutique — servi par les fichiers `loading.tsx` de
 * l'App Router pendant qu'un segment se charge.
 *
 * Un seul geste, en trois temps : le filet du sigle se trace, le bloc se
 * remplit par le bas comme de l'encre qui monte — découvrant les deux K
 * évidés —, puis une onde part du centre au moment où le bloc se referme. Le
 * logotype se pose enfin en resserrant son interlettrage jusqu'à la valeur de
 * la charte. Pas de roue qui tourne ni de barre indéterminée : le remplissage
 * fait office d'indicateur, et il porte l'identité.
 *
 * Le sigle est le monogramme officiel (`assets/marque/kk-monogramme.png`,
 * celui du favicon), vectorisé — et non un symbole approchant.
 *
 * Aucun état, aucun effet : tout est en CSS (voir globals.css, section
 * « Écran d'attente »). Le composant reste donc rendu côté serveur et n'ajoute
 * rien au JavaScript envoyé au navigateur — un écran de chargement qui attend
 * son propre bundle serait une contradiction.
 */

/** Le sigle de la marque, animé : filet tracé puis bloc rempli. */
function AnimatedMonogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 532 532" className={className} aria-hidden="true">
      {/* `pathLength={1}` normalise la longueur : les réglages de tirets
          restent lisibles et indépendants de la géométrie réelle. */}
      <rect
        x="2.5"
        y="2.5"
        width="527"
        height="527"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        pathLength={1}
        className="kkl-frame"
      />
      <path fill="currentColor" fillRule="evenodd" d={KK_MONOGRAM_PATH} className="kkl-block" />
    </svg>
  );
}

export function BrandLoader({
  /** Ligne d'attente. Doit décrire ce qui se prépare, pas meubler. */
  message = "Nous préparons votre sélection",
}: {
  message?: string;
}) {
  return (
    <div
      // `role="status"` + `aria-live` : un lecteur d'écran annonce l'attente
      // sans voler le focus. Le texte visible sert aux deux publics.
      role="status"
      aria-live="polite"
      className="kkl-screen grid min-h-screen place-items-center bg-cream px-6"
    >
      <div className="flex flex-col items-center">
        {/* L'onde part du centre du sigle : posée derrière lui, à la même
            échelle, elle se diffuse une fois par cycle. */}
        <div className="relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
          <span className="kkl-ripple" aria-hidden="true" />
          <span className="kkl-ripple kkl-ripple--late" aria-hidden="true" />
          <AnimatedMonogram className="relative h-full w-full text-deep" />
        </div>

        {/* L'onde déborde largement du sigle (jusqu'à 1.85×) : cette marge
            l'empêche de venir toucher le logotype en fin de diffusion. */}
        <p className="kkl-wordmark wordmark mt-16 text-[0.95rem] text-deep sm:text-lg">KOSSKOSS</p>
        <p className="kkl-tagline mt-2 text-[0.55rem] font-medium uppercase tracking-[0.5em] text-deep/60">
          Select
        </p>

        <span className="kkl-rule mt-8 block h-px w-16" aria-hidden="true" />

        <p className="kkl-message mt-5 text-center text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
