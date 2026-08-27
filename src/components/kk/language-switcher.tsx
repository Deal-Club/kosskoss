"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Bascule de langue FR / EN de l'en-tête.
 *
 * Utilise la navigation localisée de next-intl (`@/i18n/navigation`) : le
 * `pathname` renvoyé est sans préfixe de langue, et `router.replace(pathname,
 * { locale })` réapplique le bon préfixe (`/en`, ou rien pour le français à la
 * racine — `localePrefix: "as-needed"`). Le visiteur reste ainsi sur la MÊME
 * page dans l'autre langue, jamais renvoyé à l'accueil.
 *
 * Segmenté plutôt qu'un bouton unique : les deux langues sont visibles, la
 * courante est mise en avant, ce qui lève l'ambiguïté « ce libellé est-il la
 * langue actuelle ou la cible ? ».
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label={locale === "fr" ? "Choix de la langue" : "Language"}
      className={`flex items-center rounded-full border border-border/70 p-0.5 text-[0.7rem] font-semibold ${className}`}
    >
      {routing.locales.map((cible) => {
        const actif = cible === locale;
        return (
          <button
            key={cible}
            type="button"
            lang={cible}
            aria-current={actif ? "true" : undefined}
            disabled={actif}
            onClick={() => router.replace(pathname, { locale: cible })}
            className={`rounded-full px-2 py-1 uppercase tracking-wide transition ${
              actif ? "bg-deep text-primary-foreground" : "text-deep hover:bg-sand"
            }`}
          >
            {cible}
          </button>
        );
      })}
    </div>
  );
}
