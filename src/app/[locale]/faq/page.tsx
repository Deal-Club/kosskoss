import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { buildLegalMetadata, SectionBody, SectionList } from "@/components/legal/LegalPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { RichText } from "@/components/RichText";
import { findLegalPage } from "@/server/legalPages";
import { stripMarks } from "@/lib/richText";

const SLUG = "faq" as const;

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  return await buildLegalMetadata(SLUG, locale);
}

export default async function FaqPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = await findLegalPage(SLUG, locale);
  if (!page) notFound();

  // Balisage FAQPage : Google peut afficher les questions directement
  // dans les résultats de recherche. Le balisage attend du texte nu — les
  // marques de formatage sont retirées, et les puces d'une réponse sont
  // recollées pour que la réponse reste complète.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.sections.map((section) => ({
      "@type": "Question",
      name: stripMarks(section.heading),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripMarks([section.body, ...(section.list ?? [])].filter(Boolean).join(" ")).replace(
          /\s*\n+\s*/g,
          " ",
        ),
      },
    })),
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-screen-xl px-3 py-3">
            <Breadcrumb
              items={[
                { label: locale === "en" ? "Home" : "Accueil", href: "/" },
                { label: page.title },
              ]}
            />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-3 py-8">
          <h1 className="mb-2 text-2xl font-black text-foreground sm:text-3xl">{page.title}</h1>
          {page.intro && (
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              <RichText text={page.intro} />
            </p>
          )}

          <div className="flex flex-col gap-2">
            {/* La clé porte l'index : rien n'empêche deux questions identiques
                d'être saisies dans le back-office. */}
            {page.sections.map((section, index) => (
              <details
                key={`${index}-${section.heading}`}
                className="group rounded-sm border border-border bg-white open:border-primary/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground marker:content-[''] hover:text-primary">
                  <span>
                    <RichText text={section.heading} />
                  </span>
                  <span
                    aria-hidden
                    className="text-lg leading-none text-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-border px-4 py-3">
                  <SectionBody body={section.body} />
                  {section.list && section.list.length > 0 && <SectionList items={section.list} />}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      <JsonLd data={jsonLd} />
    </>
  );
}
