import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";

/**
 * Questions fréquentes, en accordéon HTML natif : <details>/<summary> se
 * déplient sans JavaScript, restent accessibles au clavier et s'impriment
 * ouverts. Aucune bibliothèque n'est nécessaire pour ça.
 *
 * Le balisage FAQPage est émis en même temps : ce sont les mêmes textes, il
 * n'y a donc aucun risque de divergence entre la page et les données
 * structurées.
 */
// Ordre d'affichage : la livraison d'abord, c'est la question que l'acheteur
// se pose avant toutes les autres. Le détail du produit vient ensuite.
const fragen = ["livraison", "abladen", "srm", "trocken", "lagern", "restaurant"] as const;

export async function HolzFaq() {
  const t = await getTranslations("faq");

  const eintraege = fragen.map((frage) => ({
    frage: t(`fragen.${frage}.frage`),
    antwort: t(`fragen.${frage}.antwort`),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: eintraege.map((eintrag) => ({
      "@type": "Question",
      name: eintrag.frage,
      acceptedAnswer: { "@type": "Answer", text: eintrag.antwort },
    })),
  };

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16">
          <div>
            <p className="eyebrow mb-3 text-primary">{t("eyebrow")}</p>
            <h2 className="font-heading text-3xl leading-tight font-black sm:text-4xl">
              {t("titel")}
            </h2>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {eintraege.map((eintrag) => (
              <details key={eintrag.frage} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 font-heading text-base font-bold transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-lg">
                  {eintrag.frage}
                  <Plus
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45"
                  />
                </summary>
                <p className="max-w-3xl pb-5 text-sm leading-relaxed text-muted-foreground">
                  {eintrag.antwort}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        // Les textes viennent du même objet que l'affichage : rien à
        // resynchroniser si une réponse change. Le « < » est échappé pour
        // qu'une réponse contenant « </script> » ne referme pas la balise.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </section>
  );
}
