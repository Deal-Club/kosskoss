import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Comparatif des essences.
 *
 * Les chiffres sont ceux du bois à 20 % d'humidité résiduelle, en kilowattheures
 * par stère empilé — la référence utilisée par la profession en France.
 * Ils ne sont pas arrondis à notre avantage : le charme chauffe mieux que le
 * hêtre, on le dit, même si nous vendons surtout du hêtre.
 */
const VRAC = "/bois-de-chauffage/vrac";

// Le catalogue est rangé par conditionnement : les feuillus renvoient tous
// vers le bois en vrac, où chaque essence est nommée dans le titre du produit.
// L'épicéa ne se vend qu'en petit bois d'allumage, rangé avec le bois compressé.
const essenzen = [
  { key: "hainbuche", kwh: 2200, dichte: 640, glut: 5, href: VRAC },
  { key: "buche", kwh: 2100, dichte: 558, glut: 4, href: VRAC },
  { key: "eiche", kwh: 2100, dichte: 570, glut: 5, href: VRAC },
  { key: "esche", kwh: 2100, dichte: 570, glut: 4, href: VRAC },
  { key: "birke", kwh: 1900, dichte: 505, glut: 3, href: VRAC },
  { key: "fichte", kwh: 1500, dichte: 379, glut: 1, href: "/bois-de-chauffage/bois-compresse" },
] as const;

const MAX_KWH = 2200;

export async function HolzartenVergleich() {
  const t = await getTranslations("holzarten");

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3 text-primary">{t("eyebrow")}</p>
          <h2 className="font-heading text-3xl leading-tight font-black sm:text-[2.6rem]">
            {t("titel")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("einleitung")}</p>
        </div>

        {/* Tableau sur grand écran, cartes empilées en mobile : les colonnes de
            chiffres ne se lisent pas à 360 px de large. */}
        <div className="hidden overflow-hidden rounded-lg border border-border md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-secondary text-white">
                <th scope="col" className="eyebrow px-4 py-3 text-[0.6rem] text-white">
                  {t("spalten.holz")}
                </th>
                <th scope="col" className="eyebrow px-4 py-3 text-[0.6rem] text-white">
                  {t("spalten.heizwert")}
                </th>
                <th scope="col" className="eyebrow px-4 py-3 text-[0.6rem] text-white">
                  {t("spalten.dichte")}
                </th>
                <th scope="col" className="eyebrow px-4 py-3 text-[0.6rem] text-white">
                  {t("spalten.glut")}
                </th>
                <th scope="col" className="eyebrow px-4 py-3 text-[0.6rem] text-white">
                  {t("spalten.eignung")}
                </th>
              </tr>
            </thead>
            <tbody>
              {essenzen.map((holz) => (
                <tr key={holz.key} className="border-t border-border even:bg-muted/50">
                  <th scope="row" className="px-4 py-3 font-heading text-base font-bold">
                    <Link href={holz.href} className="hover:text-primary hover:underline">
                      {t(`namen.${holz.key}`)}
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="messwert w-24 shrink-0 font-bold">
                        {holz.kwh.toLocaleString("fr-FR")}
                        <span className="einheit ml-1 text-foreground">kWh/rm</span>
                      </span>
                      {/* Barre de proportion : le rapport entre essences se voit
                          plus vite qu'il ne se lit. */}
                      <span className="h-2 w-full max-w-[10rem] overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${(holz.kwh / MAX_KWH) * 100}%` }}
                        />
                      </span>
                    </span>
                  </td>
                  <td className="messwert px-4 py-3 text-muted-foreground">
                    {holz.dichte}
                    <span className="einheit ml-1">kg/rm</span>
                  </td>
                  <td className="px-4 py-3">
                    <Glutskala wert={holz.glut} label={t("glutAria", { wert: holz.glut })} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t(`eignung.${holz.key}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:hidden">
          {essenzen.map((holz) => (
            <Link
              key={holz.key}
              href={holz.href}
              className="rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-heading text-base font-bold">{t(`namen.${holz.key}`)}</h3>
                <span className="messwert text-sm font-bold text-primary">
                  {holz.kwh.toLocaleString("fr-FR")}
                  <span className="einheit ml-1 text-primary">kWh/rm</span>
                </span>
              </div>
              <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(holz.kwh / MAX_KWH) * 100}%` }}
                />
              </span>
              <p className="mt-2 text-xs text-muted-foreground">{t(`eignung.${holz.key}`)}</p>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">{t("fussnote")}</p>
      </div>
    </section>
  );
}

/** Durée de braise, de 1 à 5. Cinq bûchettes plutôt que cinq étoiles. */
function Glutskala({ wert, label }: { wert: number; label: string }) {
  return (
    <span className="flex gap-1" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((stufe) => (
        <span
          key={stufe}
          aria-hidden="true"
          className={cn("block h-4 w-1.5 rounded-[1px]", stufe <= wert ? "bg-primary" : "bg-border")}
        />
      ))}
    </span>
  );
}
