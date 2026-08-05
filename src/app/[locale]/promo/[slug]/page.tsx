import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductCard } from "@/components/ProductCard";
import { CampaignCountdown } from "@/components/CampaignCountdown";
import { getCampaignLanding } from "@/server/campaignLanding";

type PageParams = Promise<{ locale: string; slug: string }>;

// La page dépend de l'heure : une offre expirée doit cesser d'exister, pas
// rester en cache avec ses prix barrés.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const landing = await getCampaignLanding(slug, locale);
  if (!landing) return { title: "MLC Bois" };

  return {
    title: `${landing.headline} | MLC Bois`,
    // L'adresse porte le code de la campagne et n'a de sens que le temps de
    // l'offre : la laisser indexer ferait remonter des prix périmés dans les
    // résultats de recherche longtemps après la fin.
    robots: { index: false, follow: true },
  };
}

export default async function CampaignLandingPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const landing = await getCampaignLanding(slug, locale);
  if (!landing) notFound();

  const t = await getTranslations("campaign");
  const common = await getTranslations("common");

  const endsAtLabel = landing.endsAt.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-screen-xl px-3 py-3">
            <Breadcrumb
              items={[{ label: common("home"), href: "/" }, { label: landing.name }]}
            />
          </div>
        </div>

        <section className="border-b border-border bg-secondary text-secondary-foreground">
          <div className="mx-auto max-w-screen-xl px-3 py-10">
            <p className="mb-2 text-[11px] font-black tracking-widest text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-3xl text-3xl leading-tight font-black tracking-tight sm:text-4xl">
              {landing.headline}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {landing.showsCountdown && (
                <CampaignCountdown endsAt={landing.endsAt.toISOString()} />
              )}
              {/* La date en toutes lettres double toujours le compte à rebours :
                  il ne s'affiche qu'une fois la page hydratée, et il reste
                  inaudible pour un lecteur d'écran. */}
              <p className="text-sm text-white/70">{t("validUntil", { date: endsAtLabel })}</p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-screen-xl px-3 py-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {landing.products.map((product) => (
              <ProductCard key={product.href} product={product} />
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            {t("legalNote", { date: endsAtLabel })}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
