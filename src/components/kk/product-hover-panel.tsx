import { ArrowRight, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { KKProductView } from "@/types/kk";

/**
 * Panneau d'information révélé au survol d'une vignette produit.
 *
 * ── L'IDÉE ───────────────────────────────────────────────────────────────────
 *
 * Un aplat VERT PROFOND — la couleur primaire de la charte — monte du bas du
 * cadre, avec un bord supérieur COURBE : un niveau qui remonte dans un pot. Le
 * packshot, lui, s'élève et s'incline légèrement au même moment ; il sort du
 * soin au lieu d'être recouvert par lui. C'est ce contre-mouvement qui fait
 * l'effet : deux gestes opposés et simultanés, là où un simple fondu au noir
 * n'en propose aucun.
 *
 * Le vert plutôt que le sable : sur un packshot photographié fond blanc, un
 * aplat sable se distinguait à peine du cadre et l'animation se voyait mal. Le
 * contraste du vert rend le mouvement lisible d'un coup d'œil sur toute la
 * grille — et c'est la couleur qui signe la marque.
 *
 * Le geste est emprunté au produit lui-même, pas à un catalogue d'animations.
 * C'est ce qui le rend difficile à confondre avec la vignette de n'importe
 * quelle autre boutique.
 *
 * ── COMMENT LA COURBE EST OBTENUE ────────────────────────────────────────────
 *
 * `rounded-t-[100%]` sur une bande de 1,5 rem : le rayon dépassant la hauteur,
 * le navigateur dessine une ellipse aplatie. Aucun SVG, aucune image, et la
 * courbe s'adapte à la largeur de la colonne — ce qu'un tracé figé ne ferait
 * pas sur une grille responsive.
 *
 * ── CE QUE LE PANNEAU CONTIENT ───────────────────────────────────────────────
 *
 * Il ne répète pas la marque, le nom et le prix : ils sont déjà lisibles sous
 * la vignette, sans survol. Il montre ce qui manquait — la description courte,
 * l'existence de plusieurs contenances — et invite à ouvrir la fiche.
 *
 * Le texte s'arrête avant le bord droit (`pr-14`) : cette réserve est la place
 * de la pastille d'ajout rapide, qui vient se poser sur la bande verte. Les
 * deux cohabitent sans se recouvrir.
 *
 * Le panneau est entièrement `pointer-events-none` : le survol et les clics
 * traversent jusqu'au lien du cadre, si bien que cliquer sur « Voir la fiche »
 * ouvre bien la fiche, et que la pastille garde sa propre zone de clic.
 *
 * ── TACTILE ──────────────────────────────────────────────────────────────────
 *
 * Sans survol, le panneau ne s'ouvre jamais : il est masqué sous `sm`. La
 * pastille d'ajout, elle, y reste visible en permanence — aucun écran ne se
 * retrouve sans moyen d'ajouter au panier depuis la grille.
 *
 * Il s'ouvre aussi au focus clavier, via `group-focus-within`.
 */

/** Durée et courbe communes, pour que les trois mouvements restent solidaires. */
const GLISSE = "duration-[620ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

export async function ProductHoverPanel({ product }: { product: KKProductView }) {
  const resume = product.shortDescription?.trim();

  // Sans description ni contenance, le panneau n'apporterait qu'un « Voir la
  // fiche » redondant avec le lien qui l'entoure : on ne l'ouvre pas.
  if (!resume && !product.hasVariants) return null;

  const t = await getTranslations("product");

  return (
    <div
      aria-hidden
      className={[
        // Masqué au doigt : sans survol il ne s'ouvrirait jamais, et il
        // recouvrirait le bas du visuel sur les petits écrans.
        // Pas de `z-index` : le panneau est rendu après l'image, il passe donc
        // déjà devant elle. Lui en donner un le ferait au contraire passer
        // devant la pastille d'ajout, qui est un frère du lien et n'en a pas.
        "pointer-events-none absolute inset-x-0 bottom-0 hidden sm:block",
        "translate-y-full transition-transform",
        GLISSE,
        "group-hover:translate-y-0 group-focus-within:translate-y-0",
        "motion-reduce:transition-none",
      ].join(" ")}
    >
      {/* Le ménisque. `-mb-px` ferme la couture d'un pixel que l'arrondi laisse
          apparaître entre la courbe et l'aplat, visible sur écran non Retina. */}
      <div className="-mb-px h-6 rounded-t-[100%] bg-deep" />

      <div className="bg-deep px-5 pt-1 pb-4">
        {resume ? (
          <p
            className={[
              "line-clamp-3 pr-14 text-[0.78rem] leading-relaxed text-primary-foreground/85",
              "translate-y-2 opacity-0 transition-[opacity,transform] duration-500 delay-100",
              "group-hover:translate-y-0 group-hover:opacity-100",
              "group-focus-within:translate-y-0 group-focus-within:opacity-100",
              "motion-reduce:translate-y-0 motion-reduce:transition-none",
            ].join(" ")}
          >
            {resume}
          </p>
        ) : null}

        {product.hasVariants ? (
          <p
            className={[
              // Laiton clair : le seul ton d'accent lisible sur le vert profond
              // (5,9:1), déjà employé pour les sur-titres sur fond sombre.
              "mt-2 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.1em] text-gold-soft uppercase",
              "translate-y-2 opacity-0 transition-[opacity,transform] duration-500 delay-[170ms]",
              "group-hover:translate-y-0 group-hover:opacity-100",
              "group-focus-within:translate-y-0 group-focus-within:opacity-100",
              "motion-reduce:translate-y-0 motion-reduce:transition-none",
            ].join(" ")}
          >
            <Layers className="h-3.5 w-3.5" />
            {t("hoverMultipleVariants")}
          </p>
        ) : null}

        <p
          className={[
            "mt-2.5 flex items-center gap-1.5 pr-14 text-[0.72rem] font-semibold tracking-[0.08em] text-primary-foreground uppercase",
            "translate-y-2 opacity-0 transition-[opacity,transform] duration-500 delay-[240ms]",
            "group-hover:translate-y-0 group-hover:opacity-100",
            "group-focus-within:translate-y-0 group-focus-within:opacity-100",
            "motion-reduce:translate-y-0 motion-reduce:transition-none",
          ].join(" ")}
        >
          {t("hoverSeeSheet")}
          {/* La flèche part avec un dernier décalage : elle ponctue la séquence
              plutôt que de l'accompagner. */}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 delay-[300ms] group-hover:translate-x-1" />
        </p>
      </div>
    </div>
  );
}
