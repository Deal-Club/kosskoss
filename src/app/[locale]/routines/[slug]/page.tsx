import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ChevronRight, Sun, Moon } from "lucide-react";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { RoutineAddToCart } from "@/components/kk/routine-add";
import { tintClass } from "@/components/kk/routine-card";
import { BottleMotif } from "@/components/kk/motifs";
import { getRoutine, getRoutines } from "@/server/kk/routines";
import { PREOCCUPATIONS, libellesPourTags } from "@/lib/kk/besoins";
import { libelleNiveau } from "@/lib/kk/routines-niveau";
import { formatFcfa } from "@/lib/kk/format";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const routine = await getRoutine(slug, locale);
  if (!routine) {
    const t = await getTranslations({ locale, namespace: "routine" });
    return { title: t("metaNotFoundTitle", { brand: BRAND.name }) };
  }

  return {
    title: `${routine.name} — ${BRAND.name}`,
    description: routine.claim || routine.description.slice(0, 155),
    alternates: alternatesFor(`/routines/${routine.slug}`, locale),
  };
}

/**
 * Page d'une routine.
 *
 * Elle donne à la routine ce qui lui manquait pour exister : une URL. On peut
 * l'indexer, la partager, y revenir. Sans cela, une routine n'était qu'un état
 * de composant, perdu au premier rechargement.
 *
 * La composition est expliquée geste par geste — c'est le pilier « Expertise /
 * Conseil » de la charte : « nous guidons, nous ne nous contentons pas de
 * montrer un rayon ». Le rayon filtré reste accessible en bas de page, pour qui
 * veut choisir lui-même ; mais il vient en second.
 */
export default async function RoutinePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "routine" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tHeader = await getTranslations({ locale, namespace: "header" });

  const routine = await getRoutine(slug, locale);
  if (!routine) notFound();

  // Niveau en toutes lettres — jamais écrit en dur, toujours lu par ce module
  // pur (`src/lib/kk/routines-niveau.ts`) : c'est lui qui sait que le « Eco »
  // du master s'affiche « Essentielle ».
  const niveauLabel = libelleNiveau(routine.niveau);

  // Ligne de préoccupations du modèle client (« Boutons • Brillance • Marques
  // post-imperfections ») : même registre et même fonction que la fiche
  // produit (lot 7D, tâche 1) — `routine.tags` est l'union des tags des
  // produits encore servables de la routine, posée côté serveur
  // (`src/server/kk/routines.ts`). Peut être vide : aucune routine ne
  // l'invente alors.
  const preoccupationLabels = libellesPourTags(routine.tags, PREOCCUPATIONS, locale);

  // Parcours numéroté du modèle (« 01 NETTOYER → 02 TRAITER → 03 PROTÉGER ») :
  // le rôle du geste prime sur son étiquette générique — voir la note sur
  // `KKRoutineStepView.role` — avec repli sur `label` pour les 5 routines
  // historiques, non couvertes par le master.
  const parcours = routine.steps
    .map((s, i) => `${String(i + 1).padStart(2, "0")} ${s.role || s.label}`)
    .join(" → ");

  const autres = (await getRoutines(locale)).filter((r) => r.id !== routine.id).slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <nav aria-label={tCommon("breadcrumb")} className="mx-auto max-w-7xl px-6 py-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Link href="/" className="transition hover:text-deep">
                {tCommon("home")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="flex items-center gap-1.5">
              <Link href="/routines" className="transition hover:text-deep">
                {tHeader("navRoutines")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="text-deep">{routine.name}</li>
          </ol>
        </nav>

        {/* En-tête sur la teinte de la routine : la couleur qui l'identifiait
            sur l'accueil la suit ici. C'est ce qui fait d'une teinte un repère
            et non un ornement.

            BANDEAU FIN, ET VOLONTAIREMENT. L'en-tête portait auparavant la
            description, le prix et l'ajout au panier : il occupait la moitié de
            l'écran, et repoussait sous la ligne de flottaison le contenu qui
            justifie la page — la composition geste par geste.

            Les trois éléments retirés ne sont pas perdus pour autant : le prix
            et l'ajout au panier vivent dans le récapitulatif collant, qui suit
            la lecture au lieu d'attendre en haut ; la description est reprise
            en tête de la composition, là où on la lit vraiment. */}
        <section className={`${tintClass(routine.tint)}`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <div className="max-w-2xl">
              {/* Niveau en toutes lettres (jamais « Eco » écrit en dur — voir
                  `niveauLabel` ci-dessus) et nombre de gestes : les deux
                  premiers repères du modèle client, avant même le nom. */}
              <p className="eyebrow">
                <span aria-label={t("levelBadgeAria", { level: niveauLabel })}>{niveauLabel}</span>
                {" · "}
                {tHeader("stepsCount", { count: routine.steps.length })}
              </p>
              <h1 className="mt-2 text-deep">{routine.name}</h1>

              {/* Accroche courte du master (« Meilleur rapport
                  efficacité/prix »…) — absente sur certaines routines : la
                  ligne ne s'affiche alors simplement pas. */}
              {routine.badge && (
                <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gold-ink">
                  {routine.badge}
                </p>
              )}

              {/* Profil visé, texte libre du master (« Peaux mixtes à
                  grasses, boutons, brillance… ») : c'est LUI qui porte le
                  type de peau du modèle client — jamais recomposé à partir
                  des tags, qui serviraient à mentir sur une distinction que
                  le champ ne fait pas explicitement. */}
              {routine.profilCible && (
                <p className="mt-2 text-sm leading-relaxed text-deep/80">{routine.profilCible}</p>
              )}

              {/* Ligne de préoccupations, agrégée sur les produits de la
                  routine — même registre que la fiche produit. */}
              {preoccupationLabels.length > 0 && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-deep/60">
                  {preoccupationLabels.join(" • ")}
                </p>
              )}
            </div>

            {/* Les produits de la routine, en ligne. Réduits de moitié : dans un
                bandeau fin, ils signent la routine d'un coup d'œil, ils n'ont
                plus à la mettre en scène — les mêmes visuels sont repris en
                grand dans la composition. */}
            <div className="flex shrink-0 items-end gap-1.5" aria-hidden="true">
              {routine.steps.map((step, i) => (
                <div
                  key={step.id}
                  className="relative h-20 w-14 shrink-0 sm:h-24 sm:w-16"
                  style={{ marginBottom: i % 2 === 1 ? "0.6rem" : 0 }}
                >
                  {step.product.image ? (
                    <Image
                      src={step.product.image}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-contain object-bottom"
                    />
                  ) : (
                    <BottleMotif className="absolute inset-0 m-auto h-full w-auto text-deep/25" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Le détail des gestes, dans l'ordre. L'ordre est la valeur ajoutée :
            les mêmes produits appliqués dans le désordre ne donnent pas le même
            résultat.

            Deux colonnes, dont un récapitulatif COLLANT : le total et l'ajout au
            panier restaient auparavant tout en bas, après les gestes. Le
            visiteur qui lisait la composition devait redescendre pour agir, ou
            remonter pour revoir le prix. Le récapitulatif suit maintenant la
            lecture. */}
        <section className="section mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
            <div>
              {/* La promesse (modèle client) — « Promesse » du master,
                  `Routine.claim`. Absente sur aucune des 14 routines
                  importées, mais gardée quand même : les 5 routines
                  historiques, hors master, peuvent l'avoir vide. */}
              {routine.claim && (
                <>
                  <h2 className="text-deep">{t("promiseTitle")}</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-foreground/85">{routine.claim}</p>
                </>
              )}

              {/* Parcours numéroté (modèle client) — « 01 NETTOYER → 02
                  TRAITER → 03 PROTÉGER » — avant le détail geste par geste
                  qui suit. */}
              <p className={`eyebrow ${routine.claim ? "mt-8" : ""}`}>
                {t("journeyTitle", { count: routine.steps.length })}
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.1em] text-deep">{parcours}</p>

              <p className="eyebrow mt-8">{t("detailEyebrow")}</p>
              <h2 className="mt-2 text-deep">{t("detailTitle")}</h2>
              {routine.description && (
                <p className="mt-4 max-w-2xl leading-relaxed text-foreground/85">
                  {routine.description}
                </p>
              )}

          {/* Gestes resserrés.

              Trois choses gonflaient ces cartes sans rien apporter : un carreau
              d'image de 128 px qui imposait à lui seul la hauteur de la ligne,
              un titre à la taille par défaut des h3 — celle des titres de
              section, ici pour un nom de produit — et l'étiquette du geste
              seule sur sa ligne, la marque seule sur la suivante, alors que la
              largeur restait vide à droite.

              Les deux libellés partagent donc maintenant la ligne du numéro,
              l'image descend à 80 px, et le nom prend une taille de nom. La
              carte perd environ un tiers de sa hauteur sans qu'aucune
              information ne disparaisse. */}
          <ol className="mt-8 space-y-3">
            {routine.steps.map((step, i) => {
              const p = step.product;
              return (
                <li
                  key={step.id}
                  className="flex gap-4 rounded-2xl border border-border/70 bg-card p-4"
                >
                  <div className={`relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:block ${tintClass(routine.tint)}`}>
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill sizes="80px" className="object-contain p-1.5" />
                    ) : (
                      <BottleMotif className="absolute inset-0 m-auto h-3/5 text-deep/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Numéro, geste et marque sur une seule ligne : trois
                        informations courtes qui tenaient sur trois lignes. */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-deep text-[0.65rem] font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      {/* Le rôle du geste, DANS CETTE routine, prime sur son
                          étiquette générique — voir la note sur
                          `KKRoutineStepView.role`. Repli sur `label` pour les
                          5 routines historiques, hors master, où `role` est
                          vide. */}
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-deep">
                        {step.role || step.label}
                      </span>
                      <span aria-hidden="true" className="text-muted-foreground/40">
                        ·
                      </span>
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {p.brand}
                      </span>
                    </div>

                    <h3 className="mt-1.5 font-display text-[1.15rem] leading-snug">
                      <Link href={p.href ?? "#"} className="text-deep transition hover:text-deep/70">
                        {p.name}
                      </Link>
                    </h3>

                    {step.why && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.why}</p>
                    )}

                    {/* Pas de prix à l'unité ici. La routine se vend comme un
                        tout : afficher huit montants successifs invite à les
                        additionner de tête et à comparer chaque geste au reste
                        du catalogue, au lieu de lire la composition. Le seul
                        montant qui engage est celui du récapitulatif, à droite,
                        et il reste sous les yeux pendant toute la lecture. */}
                  </div>
                </li>
              );
            })}
          </ol>

              {/* Matin et soir, tels que le master les décrit (`usageMatin` /
                  `usageSoir`, texte libre — ex. « Nettoyant → ACT-5 → SPF50 »).
                  Chaque bloc ne s'affiche que si le champ est renseigné : une
                  routine corps sans étape matin, par exemple, n'affiche que
                  le soir. */}
              {(routine.usageMatin || routine.usageSoir) && (
                <div className="mt-10 grid gap-5 sm:grid-cols-2">
                  {routine.usageMatin && (
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                      {/* Icône au trait, jamais un emoji : même registre que
                          les intertitres de la fiche produit. */}
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-deep">
                        <Sun className="h-4 w-4 shrink-0 text-gold-ink" strokeWidth={1.75} aria-hidden="true" />
                        {t("morningTitle")}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{routine.usageMatin}</p>
                    </div>
                  )}
                  {routine.usageSoir && (
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-deep">
                        <Moon className="h-4 w-4 shrink-0 text-gold-ink" strokeWidth={1.75} aria-hidden="true" />
                        {t("eveningTitle")}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{routine.usageSoir}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Le mot de l'équipe — `noteKossKoss`. Toutes les routines
                  n'en ont pas : un intertitre suivi du vide serait pire
                  qu'une fiche courte. */}
              {routine.noteKossKoss && (
                <div className="mt-8">
                  <h2 className="text-deep">{t("whyRoutineTitle")}</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-foreground/85">{routine.noteKossKoss}</p>
                </div>
              )}

              {/* Deuxième porte, en une phrase : les autres routines toutes
                  faites, ou le diagnostic qui en compose une sur mesure.
                  Elle remplace le renvoi vers le rayon filtré, qui rendait une
                  grille de produits à trier — c'est-à-dire le travail que la
                  routine venait précisément d'épargner.

                  Affichée sans condition : elle ne dépend plus du besoin
                  associé à la routine. */}
              <p className="mt-8 text-sm text-muted-foreground">
                {t.rich("browseOthers", {
                  routines: (chunks) => (
                    <Link href="/routines" className="font-medium text-deep kk-underline">
                      {chunks}
                    </Link>
                  ),
                  diagnostic: (chunks) => (
                    <Link href="/diagnostic" className="font-medium text-deep kk-underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>

            {/* Récapitulatif collant. `self-start` est indispensable : sans lui,
                la colonne des gestes étire celle-ci à sa hauteur et `sticky`
                n'a plus de course. */}
            {/* Le récapitulatif passe au vert profond.

                Il portait exactement l'habillage des gestes de gauche — même
                `bg-card`, même `border-border/70`, même `rounded-2xl` — et se
                lisait donc comme une quatrième carte de la liste, alors qu'il
                ne décrit rien : il totalise et il engage. La page étant claire
                de bout en bout (hero, gestes, « autres routines » en sable), le
                fond sombre en fait le seul point d'ancrage de l'écran, à
                l'endroit exact où l'on décide.

                Le filet de laiton en tête suit la règle de la palette : l'or
                n'habille jamais du texte sur fond clair, il ne sert que de
                trait décoratif. */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-2xl bg-deep text-primary-foreground shadow-[0_18px_40px_-24px_rgba(17,41,45,0.7)]">
                <div aria-hidden="true" className="h-0.5 w-full bg-gradient-to-r from-gold/70 via-gold to-gold/20" />

                <div className="p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-soft">
                    {t("summaryTitle")}
                  </h2>
                  <p className="mt-1 text-xs text-primary-foreground/60">
                    {t("summarySubtitle", { count: routine.steps.length })}
                  </p>

                  {/* Filets plutôt qu'espacements : sur un fond sombre, la ligne
                      structure la lecture chiffrée mieux qu'un blanc, et donne
                      au bloc son air de relevé. */}
                  <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
                    {routine.steps.map((step, i) => (
                      <li key={step.id} className="flex justify-between gap-3 py-3 text-sm">
                        <span className="text-primary-foreground/90">
                          <span className="figure text-primary-foreground/55">{i + 1}. </span>
                          {step.product.name}
                        </span>
                        <span className="figure shrink-0 text-primary-foreground/80">
                          {formatFcfa(step.product.priceFcfa)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Valeur des produits, puis prix de la routine — modèle
                      client. Les DEUX se calculent depuis les produits liés
                      (`routine.totalFcfa`, sommé côté serveur à chaque rendu,
                      jamais lu en base) : le schéma ne porte aucune remise de
                      bundle, les deux montants sont donc identiques
                      aujourd'hui — mais restent deux lectures distinctes du
                      même calcul, jamais une valeur figée recopiée. */}
                  <div className="mt-5 flex items-baseline justify-between gap-3 text-xs text-primary-foreground/60">
                    <span className="uppercase tracking-wide">{t("valueLabel")}</span>
                    <span className="figure">{formatFcfa(routine.totalFcfa)}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold tracking-wide text-primary-foreground/70 uppercase">
                      {t("priceLabel")}
                    </span>
                    <span className="figure text-2xl font-semibold text-primary-foreground">
                      {formatFcfa(routine.totalFcfa)}
                    </span>
                  </div>

                  {/* `mode="achat"` : le clic file au tunnel de commande sans
                      s'arrêter au panier. Le panier reste traversé — c'est lui
                      qui porte les lignes que le tunnel relit — mais il n'est
                      plus une étape que le visiteur voit.

                      `variant="light"` = bouton sable, la variante prévue pour
                      les fonds sombres ; il se remplit de vert profond au
                      survol. */}
                  <RoutineAddToCart
                    routine={routine}
                    variant="light"
                    mode="achat"
                    className="mt-5 w-full px-6 py-3.5"
                  />

                  {/* Ce que fait le bouton, dit avant le clic : sur une routine,
                      un intitulé seul laisse croire à un article unique. */}
                  <p className="mt-3 text-center text-xs text-primary-foreground/55">
                    {t("buyNote", { count: routine.steps.length })}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {autres.length > 0 && (
          <section className="border-t border-border/60 bg-sand/40">
            <div className="mx-auto max-w-7xl px-6 py-14">
              <p className="eyebrow">{t("othersEyebrow")}</p>
              <h2 className="mt-2 text-deep">{t("othersTitle")}</h2>
              <ul className="mt-7 grid gap-4 sm:grid-cols-3">
                {autres.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      className="kk-lift group flex h-full items-center gap-4 rounded-2xl border border-border/70 bg-card p-4"
                    >
                      <span className={`h-14 w-14 shrink-0 rounded-xl ${tintClass(r.tint)}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[1.05rem] leading-snug text-deep">
                          {r.name}
                        </span>
                        <span className="figure mt-0.5 block text-sm text-muted-foreground">
                          {tCommon("from")} {formatFcfa(r.totalFcfa)}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-deep transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
