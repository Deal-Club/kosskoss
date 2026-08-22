import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CheckoutHeader, SiteFooter } from "@/components/kk/chrome";
import { CheckoutForm } from "@/components/kk/checkout-form";
import { paiementDisponible } from "@/server/kk/paiement";
import { getEnabledPaymentMethods } from "@/server/kk/payments";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export const metadata: Metadata = {
  title: "Finaliser la commande — KossKoss Select",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Les moyens de paiement viennent du back-office, pas d'une liste figée dans
  // le formulaire : ce que l'administration active est ce que le client voit.
  const payments = await getEnabledPaymentMethods(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <CheckoutHeader />
      <main className="flex-1">
        <CheckoutForm locale={locale} payments={payments} passerelleActive={paiementDisponible()} />
      </main>
      <SiteFooter />
    </div>
  );
}
