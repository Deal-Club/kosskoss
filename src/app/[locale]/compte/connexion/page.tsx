import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AccountAuthShell } from "@/components/account/AccountShell";
import { LoginForm } from "@/components/account/LoginForm";
import { safeReturnPath } from "@/components/account/request";
import { getCurrentCustomer } from "@/server/customerSession";

type PageParams = Promise<{ locale: string }>;
type PageSearch = Promise<{ weiter?: string; hinweis?: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("login.metaTitle"), robots: { index: false, follow: false } };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearch;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Déjà connecté : inutile de redemander les identifiants.
  const current = await getCurrentCustomer();
  if (current) {
    redirect({ href: "/compte", locale });
  }

  const { weiter, hinweis } = await searchParams;
  const t = await getTranslations({ locale, namespace: "account" });

  const notice =
    hinweis === "registriert" ? "registered" : hinweis === "passwort" ? "passwordChanged" : undefined;

  return (
    <AccountAuthShell locale={locale} title={t("login.title")} intro={t("login.intro")}>
      <LoginForm returnPath={safeReturnPath(weiter)} notice={notice} />
    </AccountAuthShell>
  );
}
