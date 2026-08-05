import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * La section de preuve : l'humidité résiduelle.
 *
 * C'est la seule donnée qui sépare un bon bois d'un mauvais, et la seule que
 * l'acheteur ne peut pas vérifier à l'écran. On la montre donc à l'échelle,
 * avec la limite légale (1. BImSchV, 25 %) tracée au même endroit — y compris
 * quand elle ne nous arrange pas.
 */

// Bornes de l'échelle, en pourcentage d'humidité résiduelle.
const SKALA_NASS = 60;
const SKALA_TROCKEN = 8;

function position(feuchte: number): number {
  return ((SKALA_NASS - feuchte) / (SKALA_NASS - SKALA_TROCKEN)) * 100;
}

const stufen = [
  { key: "frisch", feuchte: 55, energie: "2,0", ton: "nass" },
  { key: "luft", feuchte: 22, energie: "3,8", ton: "mittel" },
  { key: "kammer", feuchte: 16, energie: "4,2", ton: "trocken" },
] as const;

const GRENZWERT = 25;

export async function RestfeuchteSkala() {
  const t = await getTranslations("feuchte");

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-end">
          <div>
            <p className="eyebrow mb-3 text-primary">{t("eyebrow")}</p>
            <h2 className="max-w-2xl font-heading text-3xl leading-tight font-black sm:text-[2.6rem]">
              {t("titel")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t("einleitung")}
            </p>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-lg lg:block">
            <Image
              src="/images/brennholz/kaminfeuer.jpg"
              alt={t("bildAlt")}
              fill
              sizes="20rem"
              className="object-cover"
            />
          </div>
        </div>

        {/* L'échelle. Le dégradé va du bois vert à gauche au bois de chambre à
            droite : la lecture suit le sens du séchage. */}
        <div className="mt-12">
          <div className="relative h-3 rounded-full bg-gradient-to-r from-forst via-primary/70 to-primary" />

          <div className="relative mt-2 h-20">
            {/* Limite légale : trait plein, elle n'est pas négociable */}
            <div
              className="absolute top-0 -translate-x-1/2 text-center"
              style={{ left: `${position(GRENZWERT)}%` }}
            >
              <span className="mx-auto block h-6 w-px bg-foreground/40" />
              <span className="messwert mt-1 block text-xs font-bold whitespace-nowrap text-foreground">
                {GRENZWERT} %
              </span>
              <span className="mt-0.5 block max-w-[9rem] text-[0.68rem] leading-tight text-muted-foreground">
                {t("grenzwert")}
              </span>
            </div>
          </div>

          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            {stufen.map((stufe) => (
              <div
                key={stufe.key}
                className={cn(
                  "rounded-lg border p-5",
                  stufe.ton === "trocken"
                    ? "border-primary bg-primary/[0.04]"
                    : "border-border bg-muted/60",
                )}
              >
                <p className="messwert flex items-baseline gap-1 text-3xl font-bold">
                  {stufe.feuchte}
                  <span className="einheit text-foreground">%</span>
                </p>
                <p className="mt-2 font-heading text-base font-bold">{t(`stufen.${stufe.key}.titel`)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`stufen.${stufe.key}.text`)}
                </p>
                <p className="mt-4 flex items-baseline gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                  {t("nutzbar")}
                  <span className="messwert text-base font-bold text-foreground">{stufe.energie}</span>
                  <span className="einheit text-foreground">kWh/kg</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          {t("fussnote")}
        </p>
      </div>
    </section>
  );
}
