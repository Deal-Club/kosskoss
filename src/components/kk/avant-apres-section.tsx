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
        {/* Colonne image */}
        <div className="kk-enter mx-auto w-full max-w-lg lg:mx-0">
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

        {/* Colonne contenu */}
        <div className="kk-enter max-w-lg">
          <p className="eyebrow text-white">Notre raison d&rsquo;être</p>

          <h2 className="mt-3 font-display text-3xl leading-tight text-white sm:text-4xl">
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
              <li key={pilier} className="flex items-start gap-3 text-sm leading-snug">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/60 text-gold">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-white">{pilier}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/diagnostic"
              className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-deep"
            >
              <Sparkles className="h-4 w-4" />
              Trouver ma routine
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
