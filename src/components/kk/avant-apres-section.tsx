import { LocalizedLink as Link } from "./localized-link";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { AvantApresSlider } from "./avant-apres-slider";
import type { AvantApresCase } from "@/data/kk/avant-apres";

/**
 * Section à deux colonnes : le comparateur d'un côté, la démarche de l'autre.
 *
 * ── Ce qu'elle raconte, et ce qu'elle ne raconte pas ──────────────────────
 * Ce n'est PAS un avant/après de résultats produits. C'est l'illustration du
 * propos de la maison : d'un côté ce que vivent les clientes — une offre
 * pléthorique, le risque de contrefaçon, des conseils pensés pour d'autres
 * peaux — de l'autre ce que la boutique y répond.
 *
 * La distinction n'est pas rhétorique, elle décide de ce qu'on a le droit
 * d'écrire. Une preuve de résultat engage sur un effet et demande un cas réel,
 * une durée, un consentement. Une illustration de démarche n'engage que sur la
 * méthode — à condition de ne jamais laisser croire au premier. D'où la
 * mention affichée sous l'image, et l'absence de tout délai ou pourcentage
 * dans le texte.
 *
 * ── Ce qui s'affiche sans photos ──────────────────────────────────────────
 * La colonne de texte tient seule. La colonne image laisse un aplat de marque
 * tant qu'aucun visuel n'est fourni : aucune photo de banque ne vient combler
 * le vide, elle se lirait comme le résultat que la section refuse de promettre.
 */
export function AvantApresSection({ cas }: { cas: AvantApresCase | null }) {
  // Les trois piliers, repris de l'identité de marque. Ils disent la méthode,
  // jamais un effet : « nous filtrons », « nous traçons », « nous expliquons ».
  const piliers = [
    "Un catalogue court, où chaque référence a une raison d'être",
    "Des circuits d'approvisionnement identifiés, contre la contrefaçon",
    "Des routines pensées pour les peaux riches en mélanine et le climat d'ici",
  ];

  return (
    <section className="relative overflow-hidden bg-deep text-primary-foreground">
      <div className="section-wide mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
        {/* Colonne image.
            Le plafond passe de 32 à 42 rem entre 768 et 1024 px : sur tablette
            la section n'a qu'une colonne, et un visuel bloqué à 512 px y
            flottait au milieu d'une bande vide. Il retrouve ses 32 rem dès que
            la composition redevient à deux colonnes. */}
        <div className="kk-enter mx-auto w-full max-w-lg md:max-w-2xl lg:mx-0 lg:max-w-lg">
          {cas ? (
            <>
              <AvantApresSlider
                avant={cas.avant}
                apres={cas.apres}
                altAvant={cas.altAvant}
                altApres={cas.altApres}
                legendeAvant="Le problème"
                legendeApres="Notre réponse"
              />
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                {cas.mention}
              </p>
            </>
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[4/5] w-full rounded-2xl bg-primary-foreground/[0.04] ring-1 ring-inset ring-primary-foreground/10"
            />
          )}
        </div>

        {/* Colonne contenu.
            LE PLAFOND DE 32 REM NE S'APPLIQUE PLUS QU'À PARTIR DE `lg`.
            Il valait à toutes les tailles. Sur tablette, où la section n'a
            qu'UNE colonne large de plus de 900 px, le texte restait bloqué à
            512 px et laissait la moitié droite du bloc vide — le pavé vert
            s'étendait sur toute la largeur, le contenu sur la moitié.
            Au-delà de `lg` la composition redevient à deux colonnes et le
            plafond reprend son rôle : y renoncer donnerait des lignes de
            600 px, bien au-delà des 75 caractères qu'un œil suit sans se
            perdre.
            Le corps de texte gagne un cran sur tablette pour la même raison —
            un texte calibré pour une colonne étroite paraît maigre dès qu'on
            lui donne toute la largeur. */}
        <div className="kk-enter md:text-[1.05rem] lg:max-w-lg lg:text-base">
          <p className="eyebrow text-white">Notre raison d&rsquo;être</p>

          <h2 className="mt-3 font-display text-3xl leading-tight text-white sm:text-4xl md:text-[2.6rem] lg:text-4xl">
            Bien choisir ne devrait pas être{" "}
            <span className="title-soft text-white/70">un parcours du combattant.</span>
          </h2>

          <p className="mt-5 leading-relaxed text-white/90">
            Trouver un soin qui convienne vraiment à une peau noire, mate ou métissée
            demande aujourd&rsquo;hui des heures de recherche. Des rayons entiers de
            produits qui se ressemblent, des conseils écrits pour d&rsquo;autres carnations,
            et le doute permanent sur l&rsquo;origine de ce qu&rsquo;on achète.
          </p>

          <p className="mt-4 leading-relaxed text-white/90">
            Nous avons construit KossKoss Select pour lever ces trois obstacles à la
            fois. Nous filtrons l&rsquo;offre plutôt que de l&rsquo;empiler, nous disons
            d&rsquo;où viennent les produits, et nous composons des routines complètes
            plutôt que de vendre des flacons isolés.
          </p>

          <ul className="mt-7 space-y-3">
            {piliers.map((pilier) => (
              <li key={pilier} className="flex items-start gap-3 text-sm leading-snug md:text-base lg:text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/60 text-gold md:h-6 md:w-6 lg:h-5 lg:w-5">
                  <Check className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-3 lg:w-3" />
                </span>
                <span className="text-white">{pilier}</span>
              </li>
            ))}
          </ul>

          {/* Le libellé dit où mène le bouton.
              Il annonçait « Trouver ma routine » alors qu'il ouvre le
              DIAGNOSTIC — un questionnaire, pas la liste des routines, qui a sa
              propre entrée dans le hero et dans la navigation. Deux boutons de
              promesse identique menant à deux pages différentes, c'est la
              manière la plus sûre de faire quitter celui qui croyait cliquer
              sur l'autre. Ici on est conseillé, on ne choisit pas encore. */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/diagnostic"
              className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-deep"
            >
              <Sparkles className="h-4 w-4" />
              Faire mon diagnostic
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/a-propos"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white underline-offset-4 hover:underline"
            >
              Qui nous sommes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
