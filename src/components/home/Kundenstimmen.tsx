import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { formatRating } from "@/lib/formatRating";

/**
 * Avis clients.
 *
 * Trois témoignages, dont un qui n'est pas parfait : une page où tout le monde
 * met cinq étoiles ne convainc plus personne, et le bois de chauffage est un
 * produit où les incidents de livraison existent vraiment.
 */
const stimmen = ["frank", "annika", "jochen"] as const;

interface KundenstimmenProps {
  /** Note moyenne réelle du catalogue, calculée en base. */
  schnitt: number;
  /** Nombre d'articles notés qui composent cette moyenne. */
  anzahl: number;
  locale: string;
}

export async function Kundenstimmen({ schnitt, anzahl, locale }: KundenstimmenProps) {
  const t = await getTranslations("stimmen");

  return (
    <section className="bg-muted py-14 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3 text-primary">{t("eyebrow")}</p>
            <h2 className="font-heading text-3xl leading-tight font-black sm:text-[2.6rem]">
              {t("titel")}
            </h2>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-3">
            <span className="flex" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((stern) => (
                <Star
                  key={stern}
                  className={
                    stern <= Math.round(schnitt)
                      ? "h-4 w-4 fill-primary text-primary"
                      : "h-4 w-4 text-border"
                  }
                />
              ))}
            </span>
            <span>
              <span className="messwert block text-lg leading-none font-bold">
                {formatRating(schnitt, locale)}
                <span className="einheit ml-1 text-foreground">/ 5</span>
              </span>
              <span className="mt-1 block text-[0.7rem] text-muted-foreground">
                {t("basis", { anzahl })}
              </span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stimmen.map((stimme) => (
            <figure key={stimme} className="flex flex-col rounded-lg border border-border bg-white p-5">
              <span className="mb-3 flex" aria-label={t("sterneAria", { wert: t(`kunden.${stimme}.note`) })}>
                {[1, 2, 3, 4, 5].map((stern) => (
                  <Star
                    key={stern}
                    aria-hidden="true"
                    className={
                      stern <= Number(t(`kunden.${stimme}.note`))
                        ? "h-3.5 w-3.5 fill-primary text-primary"
                        : "h-3.5 w-3.5 text-border"
                    }
                  />
                ))}
              </span>
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground">
                {t(`kunden.${stimme}.text`)}
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-3">
                <span className="block text-sm font-bold">{t(`kunden.${stimme}.name`)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`kunden.${stimme}.ort`)} · {t(`kunden.${stimme}.kauf`)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
