import Image from "next/image";

/**
 * Motif de marque KossKoss — tissage de la charte — posé en fond de section.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RÈGLE : un seul motif sur tout le parcours, jamais sous du texte courant.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le motif était monté à sept endroits, dont quatre sur la seule page
 * d'accueil, et systématiquement sous du texte. Trois sources concordantes ont
 * tranché :
 *
 *   — le retour client : « ne pas en abuser sur les pages ; ça devient
 *     agressif », et « attention si vous possédez des textes dessus avec les
 *     motifs aussi visibles ; ça nuit à la lecture » ;
 *   — la charte de marque, pilier « Afro contemporain » : « références
 *     visuelles inspirées du continent, mais ÉPURÉES, loin des clichés
 *     folkloriques » ;
 *   — les deux maquettes livrées par le client, où le motif n'apparaît
 *     strictement nulle part en fond de section.
 *
 * Il reste malgré tout : le client a explicitement trouvé notre usage du motif
 * « intéressant ». Le supprimer entièrement jetterait le seul élément de
 * territoire visuel qu'il a salué. Il est donc conservé à UN emplacement — le
 * bandeau d'inscription, en bas de page — où le texte se réduit à une ligne et
 * un champ, et où la marque peut signer sans gêner personne.
 *
 * Le fichier servi est une version WebP réduite (1400 px, ~120 Ko) ; le PNG
 * d'origine, 11 Mo, est archivé dans assets/marque/ et n'est jamais envoyé au
 * navigateur.
 *
 * Le motif n'est pas raccordable : ses bords ne se rejoignent pas proprement.
 * Il couvre donc la section (`object-cover`) au lieu de se répéter, ce qui
 * évite toute couture visible quelle que soit la largeur d'écran.
 *
 * Décor pur : `alt=""` et `aria-hidden`, il ne s'annonce pas aux lecteurs
 * d'écran et ne capte aucun clic.
 */

/**
 * Voile de lisibilité posé par-dessus le motif.
 *
 * L'ancien voile `split` était à l'envers du contenu : il allait de `deep`
 * (opaque) à gauche vers `deep/25` (presque nu) à droite, alors que les
 * sections concernées portaient justement leur contenu dense dans la colonne
 * de DROITE. Le texte se retrouvait posé exactement là où le motif était le
 * plus visible — l'origine directe du reproche.
 *
 * Les deux voiles restants sont donc calibrés sur l'inverse : opaques du côté
 * du contenu, respirants du côté vide.
 */
const VEIL = {
  /**
   * Contenu en colonne de GAUCHE : voile plein de ce côté, qui ne se relâche
   * qu'au-delà de 65 %, là où plus aucun texte ne passe.
   */
  left: "bg-gradient-to-r from-deep via-deep/95 to-deep/55",
  /**
   * Contenu en colonne de DROITE : le miroir du précédent.
   */
  right: "bg-gradient-to-l from-deep via-deep/95 to-deep/55",
  /**
   * Bandeau au texte centré : voile plein au milieu, qui ne se relâche que sur
   * les bords extérieurs.
   */
  center:
    "bg-[radial-gradient(ellipse_at_center,var(--deep)_0%,color-mix(in_oklab,var(--deep)_92%,transparent)_60%,color-mix(in_oklab,var(--deep)_70%,transparent)_100%)]",
} as const;

export function PatternBackdrop({
  align = "center",
  /**
   * Opacité du motif. Le défaut descend de 45 % à 18 % : à cette valeur le
   * tissage se lit comme une matière et non comme un dessin, ce qui est
   * exactement le registre demandé par la charte.
   */
  opacity = "opacity-[0.18]",
}: {
  align?: keyof typeof VEIL;
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
