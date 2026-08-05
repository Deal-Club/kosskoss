import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPageView, buildLegalMetadata } from "@/components/legal/LegalPageView";

const SLUG = "livraison" as const;

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  return await buildLegalMetadata(SLUG, locale);
}

export default async function LivraisonPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPageView slug={SLUG} locale={locale} />;
}
