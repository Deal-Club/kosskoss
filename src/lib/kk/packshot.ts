import DETOURES from "@/data/kk/packshots-detoures.json";

/**
 * Visuel produit détouré, quand il existe.
 *
 * Les visuels du catalogue sont des JPG, format sans transparence : chaque
 * flacon traîne son fond de studio. Invisible sur une carte blanche, ce fond
 * devient un rectangle gris dès que la vignette est posée sur une teinte de
 * routine — c'est ce que le retour client décrit par « du fait qu'elles ont du
 * background, ça a gâté l'affichage ».
 *
 * `scripts/detourer-packshots.py` produit une version WebP détourée et recadrée
 * de chaque visuel, et écrit la liste de ce qu'il a réellement traité. On s'y
 * réfère plutôt que de deviner le chemin : un produit ajouté au catalogue après
 * le traitement n'aurait pas de détourage, et une URL devinée afficherait une
 * image cassée là où le JPG d'origine fait très bien l'affaire.
 */

const DISPONIBLES = new Set(DETOURES as string[]);

/**
 * Rend le chemin du visuel détouré, ou le visuel d'origine à défaut.
 *
 * `null` reste `null` : c'est aux appelants de décider quoi afficher quand un
 * produit n'a pas de visuel du tout.
 */
export function packshot(image: string | null | undefined): string | null {
  if (!image) return null;

  const fichier = image.split("/").pop();
  if (!fichier) return image;

  const base = fichier.replace(/\.[^.]+$/, "");
  return DISPONIBLES.has(base) ? `/images/products/detoures/${base}.webp` : image;
}

/**
 * Vrai si le visuel est détouré, donc posable sur une couleur.
 *
 * Les appelants s'en servent pour choisir leur fond : un visuel NON détouré doit
 * rester sur du blanc, sinon son fond de studio se voit. Voir `ProductCard` et
 * la carte de routine.
 */
export function estDetoure(image: string | null | undefined): boolean {
  if (!image) return false;
  const base = image.split("/").pop()?.replace(/\.[^.]+$/, "");
  return base ? DISPONIBLES.has(base) : false;
}
