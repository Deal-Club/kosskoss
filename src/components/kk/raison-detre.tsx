import { LocalizedLink as Link } from "./localized-link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { RaisonDetreView } from "@/server/kk/raison-detre";

/**
 * Section « Notre raison d'être ».
 *
 * ── CE QUI A REMPLACÉ LE COMPARATEUR, ET POURQUOI ────────────────────────────
 *
 * La section portait un comparateur à curseur sur un visage — « LE PROBLÈME »
 * d'un côté, « NOTRE RÉPONSE » de l'autre. Le client l'a refusé, et le défaut
 * était structurel : LE VISUEL NE RÉPONDAIT PAS À LA MÊME QUESTION QUE LE TEXTE.
 *
 * Le texte parle de la difficulté de CHOISIR — trois obstacles nommés. L'image
 * montrait une PEAU qui change. Elle promettait donc un résultat cutané là où
 * la section promet un parcours d'achat simplifié. Le signe qui ne trompe pas :
 * il avait fallu écrire sous l'image « ce n'est pas un résultat client » pour
 * l'empêcher de mentir. Quand une légende doit désamorcer ce que l'image
 * raconte, c'est l'image qu'il faut changer.
 *
 * ── CE QU'ELLE MONTRE ────────────────────────────────────────────────────────
 *
 * TROIS OBSTACLES, TROIS RÉPONSES, TROIS MOYENS CHIFFRÉS. C'est la réponse
 * littérale à « qu'est-ce que ça résout, et avec quoi ». Chaque affirmation
 * porte sa preuve, comptée en base (voir server/kk/raison-detre.ts).
 *
 * Un second étage montrait l'anatomie d'une routine — trois packshots dans
 * l'ordre, avec le motif de chaque geste. Il a été retiré : la démonstration
 * faisait doublon avec le bloc « Achat rapide routines » qui suit dans la
 * page, et rallongeait une section dont on venait de resserrer le rythme.
 * Les routines gardent leur place, celle où l'on peut les acheter.
 */

/** Les trois obstacles du texte, chacun avec sa réponse et son moyen. */
type Obstacle = {
  probleme: string;
  reponse: string;
  /** Le moyen, en un chiffre. C'est lui qui transforme la promesse en preuve. */
  chiffre: string;
  precision: string;
};

export function RaisonDetre({ data }: { data: RaisonDetreView }) {
  const t = useTranslations("home");
  const obstacles: Obstacle[] = [
    {
      probleme: t("raisonDetre.obstacles.catalog.probleme"),
      reponse: t("raisonDetre.obstacles.catalog.reponse"),
      chiffre: `${data.produits}`,
      precision: t("raisonDetre.obstacles.catalog.precision"),
    },
    {
      probleme: t("raisonDetre.obstacles.routine.probleme"),
      reponse: t("raisonDetre.obstacles.routine.reponse"),
      chiffre: `${data.questions}`,
      precision: t("raisonDetre.obstacles.routine.precision"),
    },
    {
      probleme: t("raisonDetre.obstacles.circuits.probleme"),
      reponse: t("raisonDetre.obstacles.circuits.reponse"),
      chiffre: `${data.marques}`,
      precision: t("raisonDetre.obstacles.circuits.precision"),
    },
  ];

  return (
    <section className="relative overflow-hidden bg-deep text-primary-foreground">
      <div className="section-wide mx-auto max-w-7xl px-6">
        {/* ── Étage 1 : le propos, puis les trois obstacles ─────────────── */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="kk-enter lg:max-w-lg">
            <p className="eyebrow eyebrow-on-dark">{t("raisonDetre.eyebrow")}</p>

            <h2 className="mt-3 text-white">
              {t("raisonDetre.titlePart1")}{" "}
              <span className="title-soft text-white/70">{t("raisonDetre.titlePart2")}</span>
            </h2>

            <p className="mt-5 leading-relaxed text-white/85">
              {t("raisonDetre.text")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {/* Un seul bouton dans cette section : « Qui sommes-nous ». Le
                  bouton diagnostic a été retiré à la demande du client. */}
              <Link
                href="/a-propos"
                className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-deep"
              >
                {t("raisonDetre.whoWeAre")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Les trois paires. L'obstacle est barré et en retrait, la réponse
              est nette : la lecture se fait d'un coup d'œil, sans avoir à
              comparer deux colonnes. */}
          <ul className="kk-enter-stagger space-y-1">
            {obstacles.map((o) => (
              <li
                key={o.reponse}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 border-t border-white/12 py-5 last:border-b"
              >
                <span className="figure font-display text-3xl leading-none text-gold sm:text-4xl">
                  {o.chiffre}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white/45 line-through decoration-white/25">
                    {o.probleme}
                  </p>
                  <p className="mt-1.5 font-medium text-white">{o.reponse}</p>
                  <p className="mt-0.5 text-sm text-white/60">{o.precision}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}
