import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CheckoutHeader, SiteFooter } from "@/components/kk/chrome";
import { CheckoutForm } from "@/components/kk/checkout-form";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export const metadata: Metadata = {
  title: "Finaliser la commande — KossKoss Select",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="flex min-h-screen flex-col">
      <CheckoutHeader />
      <main className="flex-1">
        <CheckoutForm locale={locale} />
      </main>
      <SiteFooter />
    </div>
  );
}
