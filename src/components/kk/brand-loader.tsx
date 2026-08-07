/**
 * Écran d'attente de la boutique — servi par les fichiers `loading.tsx` de
 * l'App Router pendant qu'un segment se charge.
 *
 * Un seul geste, en trois temps : le monogramme se trace, une onde se diffuse
 * depuis son centre, le logotype se pose en resserrant son interlettrage
 * jusqu'à la valeur de la charte (0.22em). Pas de roue qui tourne ni de barre
 * indéterminée : le tracé fait office d'indicateur, et il porte l'identité.
 *
 * Aucun état, aucun effet : tout est en CSS (voir globals.css, section
 * « Écran d'attente »). Le composant reste donc rendu côté serveur et n'ajoute
 * rien au JavaScript envoyé au navigateur — un écran de chargement qui attend
 * son propre bundle serait une contradiction.
 *
 * `prefers-reduced-motion` est couvert par la règle globale de globals.css :
 * les animations se figent sur leur dernière étape. Toutes se terminent donc
 * sur l'état lisible (monogramme complet, logotype à l'endroit).
 */

/** Le monogramme du logo, dessiné trait par trait. */
function TracedMonogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" fill="none">
      {/* Encadré de la charte. `pathLength={1}` normalise la longueur du tracé :
          les réglages de dasharray restent lisibles et indépendants de la
          géométrie réelle. */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        stroke="currentColor"
        strokeWidth="1.5"
        pathLength={1}
        className="kkl-draw kkl-draw--frame"
      />
      {/* Pas d'aplat intérieur ici, contrairement au monogramme du logo : sur
          fond crème il ternissait le tracé au lieu de le porter. */}
      {/* K gauche */}
      <path
        d="M30 30 V70 M30 50 L48 30 M30 50 L48 70"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="kkl-draw kkl-draw--left"
      />
      {/* K droit */}
      <path
        d="M52 30 L70 50 L52 70"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="kkl-draw kkl-draw--right"
      />
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
        {/* L'onde part du centre du monogramme : elle est posée derrière lui,
            à la même échelle, et se diffuse une fois par cycle. */}
        <div className="relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
          <span className="kkl-ripple" aria-hidden="true" />
          <span className="kkl-ripple kkl-ripple--late" aria-hidden="true" />
          <TracedMonogram className="relative h-full w-full text-deep" />
        </div>

        {/* L'onde déborde largement du monogramme (jusqu'à 1.85×) : cette marge
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
