import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressForm } from "@/components/account/AddressForm";
import { requireCustomer } from "@/server/customerSession";

type PageParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("addresses.metaTitle"), robots: { index: false, follow: false } };
}

export default async function AccountAddressesPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const customer = await requireCustomer(locale, "/compte/adresses");
  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <AccountShell
      locale={locale}
      active="addresses"
      title={t("addresses.title")}
      intro={t("addresses.intro")}
    >
      <AddressForm
        initialBilling={customer.billing}
        initialSameAsBilling={customer.shippingSameAsBilling}
        initialShipping={customer.shipping}
        ownerName={`${customer.firstName} ${customer.lastName}`.trim()}
      />
    </AccountShell>
  );
}
