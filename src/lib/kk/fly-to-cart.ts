/**
 * Vol du produit vers le panier.
 *
 * Au clic sur « ajouter », une copie de la photo se détache de la vignette et
 * file vers l'icône du panier en rapetissant, puis disparaît. Le geste dit ce
 * que le clic vient de faire — sans quoi le tiroir s'ouvre sans qu'on sache
 * d'où vient ce qu'il contient.
 *
 * Tout est en position `fixed` sur un calque au-dessus de la page : rien n'est
 * déplacé dans le flux, aucune mise en page n'est recalculée, et l'animation
 * n'affecte pas la vignette d'origine — qui doit rester en place, le produit
 * n'ayant pas quitté le catalogue.
 *
 * L'API Web Animations est utilisée directement : elle donne une promesse de
 * fin (`finished`) sur laquelle on enchaîne l'ouverture du tiroir, là où une
 * transition CSS demanderait d'écouter `transitionend` et de gérer son
 * absence quand rien ne change.
 */

/** Attribut posé sur l'icône du panier, cible du vol. */
export const CIBLE_PANIER = "data-cible-panier";

/** Durée du vol. Assez long pour être lu, assez court pour ne pas retarder. */
const DUREE = 650;

function mouvementReduit(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fait voler une copie de `source` jusqu'à l'icône du panier.
 *
 * Rend une promesse résolue à la fin du vol — ou immédiatement si l'animation
 * n'a pas lieu (mouvement réduit, cible absente, source sans image). L'appelant
 * enchaîne dessus sans avoir à savoir si le vol a eu lieu.
 */
export async function volVersPanier(source: HTMLElement | null): Promise<void> {
  if (typeof window === "undefined" || !source || mouvementReduit()) return;

  const cible = document.querySelector<HTMLElement>(`[${CIBLE_PANIER}]`);
  if (!cible) return;

  // On vole l'image du produit si elle existe, sinon la vignette entière :
  // sur une carte sans photo, c'est le bloc coloré qui part.
  const visuel = source.querySelector("img") ?? source;
  const depart = visuel.getBoundingClientRect();
  const arrivee = cible.getBoundingClientRect();
  if (depart.width === 0 || arrivee.width === 0) return;

  const copie = visuel.cloneNode(true) as HTMLElement;
  copie.setAttribute("aria-hidden", "true");
  Object.assign(copie.style, {
    position: "fixed",
    left: `${depart.left}px`,
    top: `${depart.top}px`,
    width: `${depart.width}px`,
    height: `${depart.height}px`,
    margin: "0",
    borderRadius: "9999px",
    objectFit: "cover",
    pointerEvents: "none",
    zIndex: "60",
    willChange: "transform, opacity",
  });
  document.body.appendChild(copie);

  // Décalages du centre de la vignette vers le centre de l'icône.
  const dx = arrivee.left + arrivee.width / 2 - (depart.left + depart.width / 2);
  const dy = arrivee.top + arrivee.height / 2 - (depart.top + depart.height / 2);

  // Le vol s'incurve : la copie monte un peu avant de redescendre vers le
  // panier. Une trajectoire rectiligne se lit comme un glissement ; cette
  // courbe donne le sentiment d'un objet lancé.
  const cambrure = Math.min(120, Math.abs(dy) * 0.4 + 40);

  const animation = copie.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - cambrure}px) scale(0.6)`,
        opacity: 0.9,
        offset: 0.55,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.15, offset: 1 },
    ],
    { duration: DUREE, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
  );

  // Petite pulsation de l'icône à l'arrivée : le vol se termine sur un accusé
  // de réception, pas dans le vide.
  window.setTimeout(() => {
    cible.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
  }, DUREE - 120);

  try {
    await animation.finished;
  } catch {
    // Animation interrompue (navigation, onglet masqué) : rien à signaler,
    // le nettoyage ci-dessous a lieu de toute façon.
  } finally {
    copie.remove();
  }
}
