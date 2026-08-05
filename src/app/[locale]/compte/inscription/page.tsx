import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AccountAuthShell } from "@/components/account/AccountShell";
import { RegisterForm } from "@/components/account/RegisterForm";
import { getCurrentCustomer } from "@/server/customerSession";

type PageParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("register.metaTitle"), robots: { index: false, follow: false } };
}

export default async function RegisterPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const current = await getCurrentCustomer();
  if (current) {
    redirect({ href: "/compte", locale });
  }

  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <AccountAuthShell locale={locale} title={t("register.title")} intro={t("register.intro")}>
      <RegisterForm />
    </AccountAuthShell>
  );
}
