import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { PatternBackdrop } from "@/components/kk/pattern-backdrop";
import { RoutineCard } from "@/components/kk/routine-card";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { getRoutines } from "@/server/kk/routines";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import { Sparkles, ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "routine" });
  return {
    title: t("listMetaTitle", { brand: BRAND.name }),
    description: t("listMetaDescription"),
    alternates: alternatesFor("/routines", locale),
  };
}

/**
 * Toutes les routines prêtes à l'emploi.
 *
 * Cette page est la destination de l'entrée « Routines » du menu — la deuxième
 * du plan fourni par le client, avant « Marques » et « Conseils ». Elle
 * n'existait pas : le seul chemin vers une routine passait par le diagnostic,
 * et n'aboutissait qu'à un écran éphémère.
 */
export default async function RoutinesPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const routines = await getRoutines(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-deep text-primary-foreground">
          <PatternBackdrop align="center" />
          <div className="relative mx-auto max-w-3xl px-6 py-14 text-center">
            <p className="eyebrow eyebrow-on-dark">Besoin par besoin</p>
            <h1 className="mt-3">Nos routines prêtes à l&rsquo;emploi</h1>
            <p className="lead mx-auto mt-4 max-w-xl text-primary-foreground">
              Nous ne vendons pas des produits isolés mais des suites de gestes. Choisissez la
              préoccupation qui est la vôtre : la routine est déjà composée, dans l&rsquo;ordre
              qui la fait fonctionner.
            </p>
          </div>
        </section>

        {routines.length > 0 ? (
          <section className="mx-auto max-w-7xl px-6 py-14">
            <div className="kk-enter-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {routines.map((routine) => (
                <RoutineCard key={routine.id} routine={routine} />
              ))}
            </div>
          </section>
        ) : (
          /* Aucune routine servable : le catalogue n'est pas encore chargé, ou
             les produits qui les composent sont en rupture. Mieux vaut renvoyer
             au diagnostic qu'afficher une page vide. */
          <section className="mx-auto max-w-xl px-6 py-20 text-center">
            <h2 className="text-deep">Nos routines arrivent</h2>
            <p className="lead mt-3">
              En attendant, le diagnostic compose une routine adaptée à votre peau en cinq
              questions.
            </p>
            <Link
              href="/diagnostic"
              className="kk-fill group mt-7 inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Faire mon diagnostic
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </section>
        )}

        {/* Sortie vers le diagnostic : pour qui ne se reconnaît dans aucune des
            routines proposées. C'est la porte de secours, pas la principale. */}
        {routines.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 pb-16">
            <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-border/70 bg-sand px-7 py-7">
              <div>
                <h2 className="text-deep">Aucune ne correspond ?</h2>
                <p className="lead mt-1.5">
                  Cinq questions, et nous composons la vôtre.
                </p>
              </div>
              <Link
                href="/diagnostic"
                className="kk-fill group inline-flex shrink-0 items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" />
                Faire mon diagnostic
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
