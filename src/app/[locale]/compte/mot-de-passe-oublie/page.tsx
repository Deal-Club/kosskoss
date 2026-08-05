import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AccountAuthShell } from "@/components/account/AccountShell";
import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

type PageParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("forgot.metaTitle"), robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <AccountAuthShell locale={locale} title={t("forgot.title")} intro={t("forgot.intro")}>
      <ForgotPasswordForm />
    </AccountAuthShell>
  );
}
