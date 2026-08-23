"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "./localized-link";

/**
 * Raccourci vers le diagnostic beauté, ancré au bord droit de la fenêtre.
 *
 * ── POURQUOI UN ONGLET ANCRÉ PLUTÔT QU'UNE PASTILLE DÉPLAÇABLE ───────────────
 *
 * Un élément que l'on déplace à la souris pose trois problèmes qu'aucune
 * animation ne rattrape : il n'existe pas au doigt (le glissement est déjà pris
 * par le défilement), il n'existe pas au clavier, et il faut mémoriser sa
 * position par visiteur puis la revalider à chaque redimensionnement — sans
 * quoi il se retrouve hors écran. On perd donc en accessibilité ce qu'on gagne
 * en gadget.
 *
 * L'onglet ancré répond au même besoin — ne pas gêner, rester accessible — sans
 * aucun de ces défauts : il occupe 3,5 rem au repos, se déploie au survol ET au
 * focus clavier, et se referme seul.
 *
 * ── PLACEMENT ────────────────────────────────────────────────────────────────
 *
 * Bord droit, à mi-hauteur. Le coin bas droit est déjà pris par le bouton
 * WhatsApp et le chat Smartsupp ; le coin bas gauche l'était par cette pastille
 * elle-même, qui recouvrait le premier produit sur les écrans courts.
 *
 * ── TECHNIQUE DE L'ANIMATION ─────────────────────────────────────────────────
 *
 * Le déploiement anime `grid-template-columns` de `0fr` à `1fr` plutôt qu'une
 * largeur en pixels. C'est la seule façon d'obtenir une largeur qui s'adapte au
 * texte — donc à la traduction — tout en restant animable : `width: auto` ne
 * s'interpole pas, et une largeur codée en dur casse dès que le libellé change.
 */

/**
 * Le masquage est durable, pas seulement pour la session : refermer un
 * raccourci qui revient à chaque page n'est pas le refermer. L'accès au
 * diagnostic n'est pas perdu — il figure dans le menu, la navigation mobile et
 * le pied de page.
 */
const CLE_MASQUAGE = "kk:diagnostic-flottant-masque";

/**
 * Le masquage vit dans localStorage, c'est-à-dire hors de React. On le lit donc
 * avec `useSyncExternalStore`, et non par un état initialisé dans un effet :
 *  - `instantane` renseigne le client ;
 *  - `instantaneServeur` répond « masqué » au rendu serveur, si bien que le
 *    HTML livré ne contient jamais l'onglet et qu'aucune hydratation ne
 *    diverge — React réconcilie ensuite avec la valeur réelle ;
 *  - l'abonnement propage le clic sur la croix, et suit aussi l'événement
 *    `storage` : masquer dans un onglet masque dans les autres.
 */
const abonnes = new Set<() => void>();

function souscrire(rappel: () => void): () => void {
  abonnes.add(rappel);
  window.addEventListener("storage", rappel);
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener("storage", rappel);
  };
}

function instantane(): boolean {
  try {
    return window.localStorage.getItem(CLE_MASQUAGE) === "1";
  } catch {
    // Navigation privée ou stockage refusé : on affiche, sans mémoire.
    return false;
  }
}

function instantaneServeur(): boolean {
  return true;
}

export function DiagnosticFlottant() {
  const t = useTranslations("diagnostic");
  const masque = useSyncExternalStore(souscrire, instantane, instantaneServeur);

  const masquer = useCallback(() => {
    try {
      window.localStorage.setItem(CLE_MASQUAGE, "1");
    } catch {
      // Sans stockage, le masquage ne vaut que pour la page en cours.
    }
    abonnes.forEach((rappel) => rappel());
  }, []);

  if (masque) return null;

  return (
    <div
      className={[
        // `pointer-events-none` sur le conteneur, réactivé sur l'onglet : la
        // colonne invisible à mi-hauteur n'intercepte pas les clics de la page.
        "pointer-events-none fixed top-1/2 right-0 z-40 -translate-y-1/2",
        "flex flex-col items-end gap-2",
      ].join(" ")}
    >
      {/* `group` porte l'état de survol ET de focus : l'onglet se déploie à la
          tabulation exactement comme à la souris. */}
      <div className="group pointer-events-auto flex flex-col items-end">
        <Link
          href="/diagnostic"
          className={[
            "relative flex items-center overflow-hidden rounded-l-2xl bg-deep text-primary-foreground",
            "shadow-[0_10px_30px_-8px_rgba(15,59,70,0.55)] ring-1 ring-white/10",
            // Le liseré doré s'épaissit au déploiement : un signal de plus que
            // l'onglet a répondu, lisible même sans percevoir le mouvement.
            "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-gold",
            "before:transition-[width] before:duration-500 group-hover:before:w-1 group-focus-within:before:w-1",
            "transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "group-hover:shadow-[0_14px_40px_-8px_rgba(15,59,70,0.65)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand",
          ].join(" ")}
        >
          {/* Colonne animée : 0fr au repos, 1fr déployée. Le contenu garde sa
              largeur naturelle, seule la colonne qui le contient s'ouvre. */}
          <span
            className={[
              "grid grid-cols-[0fr] transition-[grid-template-columns]",
              "duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "group-hover:grid-cols-[1fr] group-focus-within:grid-cols-[1fr]",
              "motion-reduce:transition-none",
            ].join(" ")}
          >
            <span className="overflow-hidden">
              <span
                className={[
                  "flex items-center gap-2 whitespace-nowrap pl-5 text-sm font-semibold",
                  // Le texte suit la largeur avec un léger retard : il se pose
                  // au lieu d'être poussé. C'est ce décalage qui fait la
                  // différence entre « ça s'ouvre » et « ça s'ouvre bien ».
                  "translate-x-2 opacity-0 transition-[opacity,transform] duration-400 delay-75",
                  "group-hover:translate-x-0 group-hover:opacity-100",
                  "group-focus-within:translate-x-0 group-focus-within:opacity-100",
                  "motion-reduce:transition-none motion-reduce:translate-x-0",
                ].join(" ")}
              >
                {t("floatingCta")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </span>
            </span>
          </span>

          {/* Poignée toujours visible. Sa largeur ne bouge pas : c'est le point
              fixe autour duquel le reste s'ouvre. */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center">
            <Sparkles
              className={[
                "h-5 w-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "group-hover:scale-110 group-hover:-rotate-12",
                "motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0",
              ].join(" ")}
            />
          </span>

          <span className="sr-only">{t("floatingSrText")}</span>
        </Link>

        {/* La croix n'apparaît qu'une fois l'onglet déployé : au repos, l'onglet
            doit rester une poignée sobre, pas un bandeau publicitaire avec sa
            croix. Elle reste atteignable au clavier, le focus ouvrant le
            groupe. */}
        <button
          type="button"
          onClick={masquer}
          aria-label={t("floatingHideAria")}
          className={[
            "mt-1.5 mr-2 flex h-7 w-7 items-center justify-center rounded-full",
            "bg-deep/90 text-primary-foreground/70 ring-1 ring-white/10",
            "translate-x-4 opacity-0 transition-[opacity,transform] duration-300",
            "group-hover:translate-x-0 group-hover:opacity-100",
            "group-focus-within:translate-x-0 group-focus-within:opacity-100",
            "hover:bg-deep hover:text-primary-foreground",
            "focus-visible:translate-x-0 focus-visible:opacity-100",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand",
            "motion-reduce:transition-none",
          ].join(" ")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
