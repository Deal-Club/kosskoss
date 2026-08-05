import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/Reveal";
import type { CategoryGuide as CategoryGuideData } from "@/server/types";

// Le contenu du guide (intro, sections, conclusion) est déjà localisé en amont
// par le module de traduction du catalogue ; ici seuls les habillages le sont.
export async function CategoryGuide({
  label,
  guide,
}: {
  label: string;
  guide: CategoryGuideData;
}) {
  const t = await getTranslations("category");

  return (
    <section className="mx-auto max-w-screen-xl px-3 py-10">
      <Reveal>
        <h2 className="text-xl font-black text-foreground sm:text-2xl">{t("guideTitle", { label })}</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">{guide.intro}</p>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {guide.sections.map((section, index) => (
          <Reveal key={section.heading} delay={Math.min((index + 1) * 100, 300)}>
            <h3 className="mb-2 text-sm font-bold text-foreground">{section.heading}</h3>
            <p className="text-sm text-muted-foreground">{section.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={150}>
        <div className="mt-8 flex flex-col items-start gap-4 rounded-sm bg-secondary px-6 py-6 text-secondary-foreground transition-shadow duration-300 hover:shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm sm:text-base">{guide.closing}</p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="#produkte"
              className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              {t("guideDiscover", { label })}
            </Link>
            <Link
              href="/contact"
              className="rounded-sm bg-white/10 px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-white/20"
            >
              {t("guideAdvice")}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
