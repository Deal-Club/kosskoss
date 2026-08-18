/**
 * Lecture du consentement côté serveur.
 *
 * Isolé de `src/lib/consent.ts`, qui reste pur et utilisable par le bandeau
 * côté navigateur. Ici on touche `cookies()`, donc Next : ce module ne peut
 * vivre que sur le serveur.
 *
 * La lecture est mémorisée pour la durée du rendu : les trois emplacements de
 * `CodeSnippets` la demandent chacun de leur côté.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, allowsCategory, parseConsent, type Consent, type ConsentCategory } from "@/lib/consent";

export const readConsent = cache(async (): Promise<Consent | null> => {
  const store = await cookies();
  return parseConsent(store.get(CONSENT_COOKIE)?.value);
});

/** Le visiteur a-t-il accepté cette catégorie ? */
export async function serverAllows(category: ConsentCategory): Promise<boolean> {
  return allowsCategory(await readConsent(), category);
}
