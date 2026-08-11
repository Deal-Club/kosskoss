import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { RoutineAddToCart } from "@/components/kk/routine-add";
import { tintClass } from "@/components/kk/routine-card";
import { BottleMotif } from "@/components/kk/motifs";
import { getRoutine, getRoutines } from "@/server/kk/routines";
import { besoinParTag, libelleBesoin } from "@/lib/kk/besoins";
import { formatFcfa } from "@/lib/kk/format";
import { alternatesFor } from "@/lib/hreflang";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const routine = await getRoutine(slug, locale);
  if (!routine) return { title: "Routine introuvable — KossKoss Select" };

  return {
    title: `${routine.name} — KossKoss Select`,
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

  const routine = await getRoutine(slug, locale);
  if (!routine) notFound();

  const besoin = besoinParTag(routine.besoinTag);
  const autres = (await getRoutines(locale)).filter((r) => r.id !== routine.id).slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <nav aria-label="Fil d'Ariane" className="mx-auto max-w-7xl px-6 py-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Link href="/" className="transition hover:text-deep">
                Accueil
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="flex items-center gap-1.5">
              <Link href="/routines" className="transition hover:text-deep">
                Routines
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="text-deep">{routine.name}</li>
          </ol>
        </nav>

        {/* En-tête sur la teinte de la routine : la couleur qui l'identifiait
            sur l'accueil la suit ici. C'est ce qui fait d'une teinte un repère
            et non un ornement. */}
        <section className={`${tintClass(routine.tint)}`}>
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="max-w-xl">
              <p className="eyebrow">{besoin ? libelleBesoin(besoin, locale) : "Routine complète"}</p>
              <h1 className="mt-3 text-deep">{routine.name}</h1>
              {routine.claim && (
                <p className="mt-3 font-display text-xl text-deep">{routine.claim}</p>
              )}
              {routine.description && (
                <p className="mt-5 leading-relaxed text-deep">{routine.description}</p>
              )}

              <p className="mt-7 text-sm text-deep">
                {routine.steps.length} gestes ·{" "}
                <span className="figure text-lg font-semibold text-deep">
                  {formatFcfa(routine.totalFcfa)}
                </span>
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <RoutineAddToCart routine={routine} className="px-7 py-3.5" />
                <Link
                  href="/diagnostic"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-deep kk-underline"
                >
                  <Sparkles className="h-4 w-4" />
                  Je préfère un diagnostic
                </Link>
              </div>
            </div>

            {/* Les produits de la routine, en ligne. Visuel de la même famille
                que la carte d'accueil : on reconnaît ce qu'on a choisi. */}
            <div className="flex items-end justify-center gap-2" aria-hidden="true">
              {routine.steps.map((step, i) => (
                <div
                  key={step.id}
                  className="relative h-40 w-1/4 shrink-0 sm:h-52"
                  style={{ marginBottom: i % 2 === 1 ? "1.2rem" : 0 }}
                >
                  {step.product.image ? (
                    <Image
                      src={step.product.image}
                      alt=""
                      fill
                      sizes="140px"
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
              <p className="eyebrow">Le détail</p>
              <h2 className="mt-2 text-deep">Geste par geste</h2>

          <ol className="mt-8 space-y-5">
            {routine.steps.map((step, i) => {
              const p = step.product;
              return (
                <li
                  key={step.id}
                  className="flex gap-5 rounded-2xl border border-border/70 bg-card p-5"
                >
                  <div className={`relative hidden h-32 w-28 shrink-0 overflow-hidden rounded-xl sm:block ${tintClass(routine.tint)}`}>
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill sizes="120px" className="object-contain p-2" />
                    ) : (
                      <BottleMotif className="absolute inset-0 m-auto h-3/5 text-deep/50" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-deep text-xs font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {step.label}
                      </span>
                    </div>

                    <p className="mt-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {p.brand}
                    </p>
                    <h3 className="mt-0.5">
                      <Link href={p.href ?? "#"} className="text-deep transition hover:text-deep/70">
                        {p.name}
                      </Link>
                    </h3>

                    {step.why && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.why}</p>}

                    <p className="figure mt-2.5 text-sm font-semibold text-deep">
                      {formatFcfa(p.priceFcfa)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

              {/* Le rayon filtré, en second recours : pour qui veut composer sa
                  propre suite. La routine reste la porte principale. */}
              {besoin && (
                <p className="mt-8 text-sm text-muted-foreground">
                  Vous préférez choisir vous-même ?{" "}
                  <Link
                    href={`/soins-visage?besoin=${besoin.tag}`}
                    className="font-medium text-deep kk-underline"
                  >
                    Voir tous les produits « {libelleBesoin(besoin, locale)} »
                  </Link>
                </p>
              )}
            </div>

            {/* Récapitulatif collant. `self-start` est indispensable : sans lui,
                la colonne des gestes étire celle-ci à sa hauteur et `sticky`
                n'a plus de course. */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-deep">
                  Votre routine
                </h2>
                <ul className="mt-5 space-y-3">
                  {routine.steps.map((step, i) => (
                    <li key={step.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-foreground">
                        <span className="text-muted-foreground">{i + 1}. </span>
                        {step.product.name}
                      </span>
                      <span className="figure shrink-0 text-deep">
                        {formatFcfa(step.product.priceFcfa)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                  <span className="font-semibold text-deep">Total</span>
                  <span className="figure text-xl font-semibold text-deep">
                    {formatFcfa(routine.totalFcfa)}
                  </span>
                </div>
                <RoutineAddToCart routine={routine} className="mt-5 w-full px-6 py-3.5" />
              </div>
            </aside>
          </div>
        </section>

        {autres.length > 0 && (
          <section className="border-t border-border/60 bg-sand/40">
            <div className="mx-auto max-w-7xl px-6 py-14">
              <p className="eyebrow">Autres besoins</p>
              <h2 className="mt-2 text-deep">Nos autres routines</h2>
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
                          dès {formatFcfa(r.totalFcfa)}
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
      <MobileTabBar />
    </div>
  );
}
