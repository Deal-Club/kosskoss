import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Génère les URL canoniques et les alternances de langue (hreflang) exigées par
// Google pour un site multilingue : chaque page doit désigner sa version
// canonique et pointer vers ses équivalents dans les autres langues.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mlc-bois.fr").replace(/\/+$/, "");

/** URL absolue d'un chemin interne pour une langue donnée. */
export function localizedUrl(href: string, locale: Locale): string {
  return `${SITE_URL}${getPathname({ href, locale })}`;
}

/**
 * Bloc « alternates » prêt pour l'API Metadata de Next.
 * `x-default` pointe vers le français, langue par défaut de la boutique.
 */
export function alternatesFor(href: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const code of routing.locales) {
    languages[code] = localizedUrl(href, code);
  }
  languages["x-default"] = localizedUrl(href, routing.defaultLocale);

  return {
    canonical: localizedUrl(href, locale),
    languages,
  };
}
