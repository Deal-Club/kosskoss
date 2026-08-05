import { getTranslations } from "next-intl/server";
import { Droplets, Ruler, ShieldCheck } from "lucide-react";

/**
 * Bandeau de réassurance, juste sous le hero.
 *
 * Chaque promesse porte sa grandeur mesurable : « livraison rapide » ne veut
 * rien dire, « 48 h » se vérifie. C'est la même règle que partout sur le site.
 */
const punkte = [
  { icon: Droplets, key: "feuchte", wert: "< 18", einheit: "%" },
  { icon: Ruler, key: "laengen", wert: "25/33/50", einheit: "cm" },
  { icon: ShieldCheck, key: "herkunft", wert: "100", einheit: "% FR" },
] as const;

export async function TrustStrip() {
  const t = await getTranslations("trust");

  return (
    <section className="border-b border-border bg-muted">
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-3 sm:px-6">
        {punkte.map(({ icon: Icon, key, wert, einheit }) => (
          <div key={key} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-primary shadow-sm">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="messwert flex items-baseline gap-1 text-lg leading-none font-bold text-foreground">
                {wert}
                <span className="einheit text-foreground">{einheit}</span>
              </p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{t(key)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
