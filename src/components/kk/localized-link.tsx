"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Lien interne qui conserve la langue de la page courante.
 *
 * Le chrome de la boutique écrivait ses liens en dur (`/soins-visage`,
 * `/panier`, `/compte`…). Sur la version anglaise, un visiteur qui cliquait
 * dans le menu ou le pied de page retombait donc en français : le proxy
 * next-intl ne redirige pas, `localePrefix` étant réglé sur « as-needed ».
 *
 * Pourquoi ce composant plutôt que le `Link` de `@/i18n/navigation` : l'en-tête
 * est aussi monté par /preview, qui vit hors du segment [locale] et n'a donc
 * aucun contexte next-intl — s'y appuyer y ferait échouer la page entière. La
 * langue est ici déduite du chemin affiché, ce qui ne dépend d'aucun contexte.
 *
 * Composant client, mais utilisable depuis un composant serveur : seuls les
 * liens traversent la frontière, pas la page qui les contient.
 */

/** Langues à préfixe. Le français vit à la racine et n'en porte aucun. */
const PREFIXED_LOCALES = ["en"] as const;

/** Préfixe de la page courante, ou chaîne vide en français. */
export function localePrefixOf(pathname: string): string {
  const match = PREFIXED_LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  return match ? `/${match}` : "";
}

/**
 * Applique le préfixe à un chemin interne.
 * Les URL absolues, ancres, `tel:` et `mailto:` sortent telles quelles.
 */
export function withLocale(pathname: string, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const prefix = localePrefixOf(pathname);
  if (!prefix) return href;
  // Déjà préfixé (lien écrit en dur) : ne pas doubler.
  if (href === prefix || href.startsWith(`${prefix}/`)) return href;

  return href === "/" ? prefix : `${prefix}${href}`;
}

export function LocalizedLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  return <Link href={withLocale(pathname, href)} {...props} />;
}
