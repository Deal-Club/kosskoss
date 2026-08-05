import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/Reveal";

export interface SortimentKarte {
  slug: string;
  href: string;
  label: string;
  image: string;
  /** Prix d'entrée déjà formaté par le store, p. ex. « 165,00 € ». */
  abPreis: string;
  /** Nombre d'articles réellement en catalogue dans la catégorie. */
  anzahl: number;
}

/**
 * L'assortiment. Une carte par catégorie, avec le prix d'entrée réel lu en
 * base : afficher « à partir de » sans le chiffre ne sert à personne.
 */
export async function SortimentGrid({ karten }: { karten: SortimentKarte[] }) {
  const t = await getTranslations("sortiment");
  const common = await getTranslations("common");

  return (
    // « scroll-mt » compense la barre d'achat collante : sans lui, le titre de
    // section passerait dessous à l'arrivée de l'ancre du hero.
    <section id="catalogue" className="scroll-mt-24 bg-muted py-14 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3 text-primary">{t("eyebrow")}</p>
            <h2 className="font-heading text-3xl leading-tight font-black sm:text-[2.6rem]">
              {t("titel")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t("einleitung")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {karten.map((karte, index) => (
            <Reveal key={karte.slug} delay={Math.min(index * 55, 300)}>
              <Link
                href={karte.href}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  <Image
                    src={karte.image}
                    alt={karte.label}
                    fill
                    sizes="(min-width: 1024px) 22vw, 46vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="messwert absolute top-2 left-2 rounded-sm bg-secondary/85 px-2 py-1 text-[0.66rem] font-medium text-white">
                    {t("artikel", { anzahl: karte.anzahl })}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-heading text-base leading-tight font-bold transition-colors group-hover:text-primary sm:text-lg">
                    {karte.label}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {t(`beschreibung.${karte.slug}`)}
                  </p>
                  <p className="mt-auto flex items-baseline gap-1.5 pt-4">
                    <span className="text-[0.7rem] text-muted-foreground">{common("from")}</span>
                    <span className="messwert text-lg font-bold text-primary">{karte.abPreis}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
