import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, KeyRound, Trash2, UserRound } from "lucide-react";
import { routing } from "@/i18n/routing";
import { AccountShell } from "@/components/account/AccountShell";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";
import { requireCustomer } from "@/server/customerSession";

type PageParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("data.metaTitle"), robots: { index: false, follow: false } };
}

/**
 * Données personnelles et droits RGPD : rectification (art. 16), accès et
 * portabilité (art. 15 et 20), effacement (art. 17).
 */
export default async function AccountDataPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const customer = await requireCustomer(locale, "/compte/informations");
  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <AccountShell locale={locale} active="data" title={t("data.title")} intro={t("data.intro")}>
      <section className="rounded-sm border border-border bg-white p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-foreground">
          <UserRound className="h-5 w-5 text-primary" aria-hidden />
          {t("data.profileTitle")}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t("data.profileIntro")}</p>
        <ProfileForm
          initial={{
            salutation: customer.salutation,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email,
          }}
        />
      </section>

      <section className="rounded-sm border border-border bg-white p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-foreground">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden />
          {t("data.passwordTitle")}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t("data.passwordIntro")}</p>
        <PasswordChangeForm />
      </section>

      {/* Export : un simple lien de téléchargement suffit, la route contrôle la
          session. Pas de JavaScript, donc utilisable au clavier comme partout. */}
      <section className="rounded-sm border border-border bg-white p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-foreground">
          <Download className="h-5 w-5 text-primary" aria-hidden />
          {t("data.exportTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("data.exportIntro")}</p>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">{t("data.exportLegal")}</p>
        <a
          href="/api/account/export"
          download
          className="mt-5 inline-flex items-center gap-2 rounded-sm border border-border bg-white px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Download className="h-4 w-4" aria-hidden />
          {t("data.exportButton")}
        </a>
      </section>

      <section className="rounded-sm border border-destructive/40 bg-white p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-destructive">
          <Trash2 className="h-5 w-5" aria-hidden />
          {t("data.deleteTitle")}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t("data.deleteIntro")}</p>
        <DeleteAccountForm />
      </section>
    </AccountShell>
  );
}
