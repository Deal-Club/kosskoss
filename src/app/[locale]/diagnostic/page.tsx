import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DiagnosticFlow } from "@/components/kk/diagnostic-flow";
import { getQuestions } from "@/server/kk/diagnostic-data";
import { getCurrentCustomer } from "@/server/customerSession";
import { lireProfil } from "@/server/kk/profil-diagnostic";
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

  // Profil du client connecté, s'il en a déjà un : `lireProfil` rend un
  // tableau vide (jamais une erreur) pour un visiteur sans session, sans
  // diagnostic antérieur, ou si la colonne est corrompue — la page se
  // comporte alors comme pour un nouveau visiteur.
  const customer = await getCurrentCustomer();
  const savedAnswerIds = customer ? await lireProfil(customer.id) : [];

  return (
    <DiagnosticFlow
      questions={questions}
      savedAnswerIds={savedAnswerIds.length > 0 ? savedAnswerIds : null}
    />
  );
}
