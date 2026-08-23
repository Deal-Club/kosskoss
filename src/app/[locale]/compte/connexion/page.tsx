import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { AccountLogin } from "@/components/kk/account";
import { getCurrentCustomer } from "@/server/customerSession";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return {
    title: t("login.metaTitle"),
    robots: { index: false, follow: true },
  };
}

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
  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-md px-6 py-16">
          <h1 className="text-center text-deep">{t("login.pageTitle")}</h1>
          <p className="mt-2 text-center text-muted-foreground">{t("login.pageIntro")}</p>
          <div className="mt-8">
            <AccountLogin returnTo={suite} />
          </div>
          {/* Le compte n'a jamais été une condition pour commander : le tunnel
              d'achat reste ouvert aux visiteurs (minimisation, art. 5 § 1 c RGPD). */}
          <p className="mx-auto mt-8 max-w-sm border-t border-border pt-6 text-center text-sm text-muted-foreground">
            {t("login.guestNote")}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
