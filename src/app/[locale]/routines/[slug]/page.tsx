import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ChevronRight, Sun, Moon } from "lucide-react";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { RoutineAddToCart } from "@/components/kk/routine-add";
import { tintClass, tintCssVar } from "@/components/kk/routine-card";
import { BottleMotif } from "@/components/kk/motifs";
import { RoutineIllustration } from "@/components/kk/routine-illustration";
import { getRoutine, getRoutines } from "@/server/kk/routines";
import { libelleNiveau } from "@/lib/kk/routines-niveau";
import { BESOINS_ROUTINES, libelleBesoinRoutine } from "@/lib/kk/besoins-routines";
import { formatFcfa, formatProductTitle } from "@/lib/kk/format";
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
    title: `${routine.name} · ${BRAND.name}`,
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
  const niveauLabel = libelleNiveau(routine.niveau, locale);

  // Étiquette de besoin (« Boutons »…) — modèle client, un des trois repères
  // d'en-tête (niveau, nombre de gestes, besoin) — voir CONSIGNES de
  // MODELE_Fiche Routine_V2.docx : « Boutons ← Besoin ← B4 ». Servait déjà à
  // grouper /routines (`grouperParBesoin`), jamais montrée sur la fiche
  // elle-même. Repli sur le tag brut si le registre ne le connaît pas
  // (`besoinTag` d'un huitième besoin que le master aurait ajouté) : voir la
  // même règle dans `grouperParBesoin`.
  const besoin = BESOINS_ROUTINES.find((b) => b.tag === routine.besoinTag);
  const besoinLabel = besoin ? libelleBesoinRoutine(besoin, locale) : routine.besoinTag;

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
        <section className={`relative overflow-hidden ${tintClass(routine.tint)}`}>
          {/* La nature morte de la routine, EN FOND DE BANDEAU — mobile
              seulement (`sm:hidden`). C'est là qu'elle posait problème : sous
              `sm` le bandeau empile texte puis illustration, et l'illustration
              tombait seule en dessous, sans rien pour la relier au texte. Ici
              elle est calée en arrière-plan sous tout le bandeau, avec le texte
              par-dessus — elle devient le décor du texte plutôt qu'un bloc à
              part. Le voile dégradé qui l'accompagne la fond dans la teinte
              plutôt que de la poser comme une pièce rapportée.

              À partir de `sm`, la mise en page CÔTE À CÔTE reprend telle
              qu'elle était — c'est elle qui fonctionnait sur grand écran, le
              retour ne portait que sur le mobile.

              Ce traitement de fond ne vaut que pour la scène dessinée : une
              vraie photo de coffret (`Routine.image`) n'a pas vocation à être
              recadrée en plein cadre ni voilée d'un dégradé — elle reprend sur
              mobile la même présentation contenue que sur desktop, juste en
              dessous du texte au lieu d'à côté. */}
          {!routine.image && (
            <>
              {/* `opacity-55` : la scène ne doit jamais rivaliser avec le
                  texte, seulement suggérer un décor. Un titre sur deux lignes
                  (« Teint Net Essential ») descend sur toute la hauteur du
                  bandeau — le voile ci-dessous doit donc rester net sur TOUTE
                  la zone de texte, pas seulement sa première ligne. */}
              <div className="pointer-events-none absolute inset-0 opacity-55 sm:hidden" aria-hidden="true">
                <RoutineIllustration tint={routine.tint} fit="cover" className="h-full w-full" />
              </div>
              {/* Le voile ne s'ouvre plus qu'en bordure droite du cadre — la
                  seule zone que le texte n'atteint jamais, quelle que soit sa
                  longueur — au lieu d'un dégradé diagonal réglé sur un titre
                  précis, qui se rouvrait dès qu'un autre titre passait sur
                  deux lignes. */}
              <div
                className="pointer-events-none absolute inset-0 sm:hidden"
                style={{
                  background: `linear-gradient(100deg, ${tintCssVar(routine.tint)} 0%, ${tintCssVar(routine.tint)} 68%, color-mix(in oklab, ${tintCssVar(routine.tint)} 60%, transparent) 84%, transparent 100%)`,
                }}
                aria-hidden="true"
              />
            </>
          )}

          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
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

              {/* Profil visé, texte libre du master (« Peaux mixtes à
                  grasses, boutons, brillance… ») : c'est LUI qui porte le
                  type de peau du modèle client — jamais recomposé à partir
                  des tags, qui serviraient à mentir sur une distinction que
                  le champ ne fait pas explicitement. */}
              {routine.profilCible && (
                <p className="mt-2 text-sm leading-relaxed text-deep/80">{routine.profilCible}</p>
              )}

              {besoinLabel && (
                <span className="mt-3 inline-block rounded-full bg-card px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-deep">
                  {besoinLabel}
                </span>
              )}
            </div>

            {/* Vraie photo de coffret, sur mobile : présentation contenue, en
                flux sous le texte — le fond voilé ci-dessus ne s'applique
                qu'à la scène dessinée. Rare tant que le client n'a pas fourni
                ses visuels ; voir `Routine.image`. */}
            {routine.image && (
              <div className="relative h-44 w-full shrink-0 sm:hidden" aria-hidden="true">
                <Image
                  src={routine.image}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-contain object-bottom"
                />
              </div>
            )}

            {/* Version desktop, inchangée : posée à droite, `fit="contain"`
                pour montrer la scène entière, `-mb-7` pour l'asseoir sur le
                bord du bandeau. Cachée sous `sm`, où c'est le fond ci-dessus
                qui porte l'illustration. */}
            <div
              className="relative hidden -mb-7 h-52 w-[480px] shrink-0 self-end sm:block"
              aria-hidden="true"
            >
              {routine.image ? (
                <Image
                  src={routine.image}
                  alt=""
                  fill
                  sizes="480px"
                  className="object-contain object-bottom"
                />
              ) : (
                <RoutineIllustration
                  tint={routine.tint}
                  fit="contain"
                  className="absolute inset-0 h-full w-full"
                />
              )}
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

              {routine.description && (
                <p className="mt-8 max-w-2xl leading-relaxed text-foreground/85">
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
                  {/* Fond de vignette NEUTRE (`bg-sand`), pas la teinte de la
                      routine : le packshot est déjà photographié sur blanc, et
                      un carré teinté derrière une photo à fond blanc se lisait
                      comme deux blancs qui se disputent — la couleur de la
                      routine ternissait le produit au lieu de le mettre en
                      valeur. La teinte n'habille que le motif de secours
                      (`BottleMotif`), un dessin sans fond propre, pour lequel
                      elle reste le repère qu'elle est partout ailleurs. */}
                  <div
                    className={`relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:block ${
                      p.image ? "bg-sand" : tintClass(routine.tint)
                    }`}
                  >
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill sizes="80px" className="object-contain p-1.5" />
                    ) : (
                      <BottleMotif className="absolute inset-0 m-auto h-3/5 text-deep/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Quatre lignes, chacune sa propre information — retour
                        client : rôle et marque se disputaient la première
                        ligne, resserrés au point de se lire comme une seule
                        mention. Ici chacun respire, et le produit gagne une
                        quatrième ligne qu'il n'avait pas : ses deux premiers
                        « bienfaits » (master client, colonne Bullets), la
                        preuve concrète qui manquait à côté du seul nom. */}
                    <div className="flex items-center gap-1.5">
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
                    </div>

                    <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {p.brand}
                    </p>

                    {/* Nom du produit en texte, sans lien : la routine se vend
                        et s'achète comme un tout (voir la note sur le prix
                        plus bas), le clic ne doit donc pas ouvrir la fiche
                        produit et faire quitter la page — c'est là que se
                        prend la décision d'achat. */}
                    {/* Contenance intégrée AU TITRE (« ... - 50 ml »), demande
                        client — voir `formatProductTitle`. */}
                    <h3 className="mt-1 font-display text-[1.15rem] leading-snug text-deep">
                      {formatProductTitle(p.name, p.sizeLabel)}
                    </h3>

                    {/* Deux premiers bienfaits, mêmes textes que la section
                        « Pourquoi on l'aime » de la fiche produit — voir
                        `KKProductView.bullets`. Absents sur les produits que
                        le master n'a pas encore renseignés : la ligne ne
                        s'affiche alors simplement pas, plutôt qu'un vide. */}
                    {p.bullets && p.bullets.length > 0 && (
                      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                        {p.bullets.slice(0, 2).join(" · ")}
                      </p>
                    )}

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
                          {formatProductTitle(step.product.name, step.product.sizeLabel)}
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
                  <div className="mt-1.5">
                    {/* Libellé et prix EMPILÉS, pas côte à côte : à côté d'un
                        prix en 2xl, ce libellé plus long que « Valeur des
                        produits » n'a jamais tenu sur une ligne sans déborder
                        du bloc — que ce soit en passant lui-même à la ligne,
                        ou en repoussant le prix hors du cadre une fois
                        contraint à `nowrap`. Empilé, aucun des deux ne peut
                        plus déborder, quelle que soit la largeur d'écran. */}
                    <span className="block text-xs font-semibold tracking-wide text-primary-foreground/70 uppercase">
                      {t("priceLabel")}
                    </span>
                    <span className="figure block text-2xl font-semibold text-primary-foreground">
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

                  {/* Accroche courte du master (« Meilleur rapport
                      efficacité/prix »…), remontée ici depuis l'en-tête — retour
                      client : c'est au moment de payer qu'elle pèse, pas en tête
                      de page. Repli sur la note d'achat générique (« Les N
                      produits en une seule commande ») pour les routines que le
                      master n'a pas dotées d'une accroche. */}
                  <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.1em] text-gold-soft">
                    {routine.badge || t("buyNote", { count: routine.steps.length })}
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
                      <span
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ${tintClass(r.tint)}`}
                      >
                        {r.image ? (
                          <Image src={r.image} alt="" fill sizes="56px" className="object-cover" />
                        ) : (
                          <RoutineIllustration tint={r.tint} fit="cover" className="h-full w-full" />
                        )}
                      </span>
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
