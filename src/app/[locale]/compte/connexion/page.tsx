import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { AccountLogin } from "@/components/kk/account";
import { getCurrentCustomer } from "@/server/customerSession";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Connexion — KossKoss Select",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (await getCurrentCustomer()) redirect(locale === "en" ? "/en/compte" : "/compte");

  const suite = Array.isArray(sp.suite) ? sp.suite[0] : sp.suite;

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-md px-6 py-16">
          <h1 className="text-center text-3xl text-deep sm:text-4xl">Mon espace client</h1>
          <p className="mt-2 text-center text-muted-foreground">
            Connectez-vous pour suivre vos commandes et votre routine.
          </p>
          <div className="mt-8">
            <AccountLogin returnTo={suite} />
          </div>
          {/* Le compte n'a jamais été une condition pour commander : le tunnel
              d'achat reste ouvert aux visiteurs (minimisation, art. 5 § 1 c RGPD). */}
          <p className="mx-auto mt-8 max-w-sm border-t border-border pt-6 text-center text-sm text-muted-foreground">
            Un compte n&rsquo;est pas nécessaire pour commander. Il sert à suivre vos commandes, à
            conserver vos adresses et à retrouver vos favoris sur tous vos appareils.
          </p>
        </section>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
