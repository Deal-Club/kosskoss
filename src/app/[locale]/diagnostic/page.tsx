import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DiagnosticFlow } from "@/components/kk/diagnostic-flow";
import { getQuestions } from "@/server/kk/diagnostic-data";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export const metadata: Metadata = {
  title: "Diagnostic Beauté — KossKoss Select",
  description:
    "Répondez à quelques questions sur votre peau et recevez une routine de soins personnalisée, à ajouter au panier.",
  robots: { index: false, follow: true },
};

export default async function DiagnosticPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const questions = await getQuestions();
  return <DiagnosticFlow questions={questions} />;
}
