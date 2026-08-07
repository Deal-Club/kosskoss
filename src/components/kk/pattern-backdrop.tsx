import Image from "next/image";

/**
 * Motif de marque KossKoss — tissage bogolan de la charte — posé en fond de
 * section.
 *
 * Le fichier servi est une version WebP réduite (1400 px, ~120 Ko) ; le PNG
 * d'origine, 11 Mo, est archivé dans assets/marque/ et n'est jamais envoyé au
 * navigateur.
 *
 * Le motif n'est pas raccordable : ses bords ne se rejoignent pas proprement.
 * Il couvre donc la section (`object-cover`) au lieu de se répéter, ce qui
 * évite toute couture visible quelle que soit la largeur d'écran.
 *
 * Le motif est dessiné en bleu profond : il n'existe vraiment que sur un fond
 * sombre. Les sections qui le portent sont donc toutes en `bg-deep`, et leur
 * texte passe en crème.
 *
 * Décor pur : `alt=""` et `aria-hidden`, il ne s'annonce pas aux lecteurs
 * d'écran et ne capte aucun clic.
 */

/**
 * Voile de lisibilité posé par-dessus le motif.
 *
 * `split` — pour une section dont le texte occupe la colonne de gauche : le
 * voile est opaque de ce côté et s'efface vers la droite, où le tissage peut
 * respirer.
 * `center` — pour un bandeau de tête au texte centré : un voile régulier, un
 * peu plus dense au milieu, là où se trouvent le titre et le chapô.
 */
const VEIL = {
  /**
   * Section au texte en colonne de gauche : voile opaque de ce côté, qui
   * s'allège vers la droite où le tissage peut respirer.
   */
  split: "bg-gradient-to-r from-deep via-deep/80 to-deep/25",
  /**
   * Bandeau de tête au texte centré : voile plein au milieu, derrière le titre
   * et le chapô, qui se relâche vers les bords.
   */
  center:
    "bg-[radial-gradient(ellipse_at_center,var(--deep)_0%,color-mix(in_oklab,var(--deep)_75%,transparent)_55%,color-mix(in_oklab,var(--deep)_45%,transparent)_100%)]",
  /**
   * Pied de page. Voile calé sur `--footer` et non sur `--deep` : les deux
   * coïncident en thème clair, mais le pied de page descend plus sombre en
   * thème sombre — un voile bleu profond y ferait une tache plus claire que le
   * fond. Il est aussi plus dense : le pied de page est fait de listes de liens
   * en petit corps, qui ont besoin d'un fond calme.
   */
  footer:
    "bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--footer)_78%,transparent)_0%,color-mix(in_oklab,var(--footer)_90%,transparent)_60%,var(--footer)_100%)]",
} as const;

export function PatternBackdrop({
  align = "split",
  opacity = "opacity-45",
}: {
  align?: keyof typeof VEIL;
  /** Classe Tailwind d'opacité du motif, pour ajuster au cas par cas. */
  opacity?: string;
}) {
  return (
    <>
      <Image
        src="/images/motif-kosskoss.webp"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className={`pointer-events-none select-none object-cover ${opacity}`}
      />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${VEIL[align]}`} />
    </>
  );
}
