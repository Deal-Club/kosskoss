import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Sparkles, ArrowRight } from "lucide-react";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export const metadata: Metadata = {
  title: "Diagnostic Beauté — KossKoss Select",
  description: "Répondez à quelques questions sur votre peau et recevez une routine de soins personnalisée.",
  robots: { index: false, follow: true },
};

export default async function DiagnosticPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-deep text-primary-foreground">
            <Sparkles className="h-8 w-8" />
          </span>
          <p className="eyebrow mt-6">Diagnostic beauté</p>
          <h1 className="mt-3 text-4xl text-deep sm:text-5xl">La sélection qui vous choisit</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Notre diagnostic personnalisé arrive très bientôt : quelques questions sur votre peau et
            vos envies, et nous composons la routine de soins faite pour vous.
          </p>
          <Link
            href="/soins-visage"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-deep/90"
          >
            En attendant, découvrir la boutique
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
