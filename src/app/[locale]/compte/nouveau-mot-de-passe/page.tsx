import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AccountAuthShell } from "@/components/account/AccountShell";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import { isResetTokenValid } from "@/server/customers";
import { PRIMARY_BUTTON } from "@/components/account/formStyles";

type PageParams = Promise<{ locale: string }>;
type PageSearch = Promise<{ token?: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("reset.metaTitle"), robots: { index: false, follow: false } };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearch;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { token } = await searchParams;
  const t = await getTranslations({ locale, namespace: "account" });

  // Le jeton est contrôlé avant d'afficher le formulaire, mais sans être
  // consommé : un lien ouvert deux fois reste utilisable tant qu'il n'a pas
  // servi à changer le mot de passe.
  const valid = await isResetTokenValid(token);

  if (!valid || !token) {
    return (
      <AccountAuthShell locale={locale} title={t("reset.invalidTitle")}>
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("reset.invalidText")}</p>
          <Link href="/compte/mot-de-passe-oublie" className={`${PRIMARY_BUTTON} mt-5`}>
            {t("reset.requestNew")}
          </Link>
        </div>
      </AccountAuthShell>
    );
  }

  return (
    <AccountAuthShell locale={locale} title={t("reset.title")} intro={t("reset.intro")}>
      <ResetPasswordForm token={token} />
    </AccountAuthShell>
  );
}
