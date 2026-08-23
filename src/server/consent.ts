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
import { getActiveSnippets } from "@/server/codeSnippets";
import { getParametres } from "@/server/kk/parametres";
import { CONSENT_COOKIE, allowsCategory, parseConsent, type Consent, type ConsentCategory } from "@/lib/consent";

export const readConsent = cache(async (): Promise<Consent | null> => {
  const store = await cookies();
  return parseConsent(store.get(CONSENT_COOKIE)?.value);
});

/** Le visiteur a-t-il accepté cette catégorie ? */
export async function serverAllows(category: ConsentCategory): Promise<boolean> {
  return allowsCategory(await readConsent(), category);
}

/**
 * Y a-t-il seulement quelque chose à faire consentir ?
 *
 * ── LE BANDEAU LE PLUS AGRÉABLE EST CELUI QU'ON N'AFFICHE PAS ────────────────
 *
 * Le consentement n'est dû que si la boutique dépose autre chose que du
 * strictement nécessaire. Or ces dépôts n'existent que par les fragments posés
 * depuis « Scripts & balises » : c'est la raison même pour laquelle ce module
 * existe (voir l'en-tête de src/lib/consent.ts).
 *
 * Tant qu'aucun fragment de mesure ou de publicité n'est actif ET qu'aucun
 * identifiant GA4/Pixel n'est renseigné, le site ne pose que le panier, la
 * session et la langue — et l'article 82 de la loi Informatique et Libertés
 * dispense expressément ces cookies-là de consentement. Demander quand même,
 * c'est déranger chaque visiteur pour une question sans objet.
 *
 * Le contrôle est dynamique et non un interrupteur : le jour où quelqu'un
 * active une balise OU enregistre un identifiant GA4/Pixel au back-office, le
 * bandeau revient de lui-même. Personne n'a à se souvenir de le rallumer —
 * c'est justement le genre d'oubli qui coûte une mise en demeure.
 *
 * ── LES IDENTIFIANTS DE MESURE COMPTENT AUTANT QU'UN FRAGMENT ───────────────
 *
 * `MesureAudience` (voir `src/app/[locale]/layout.tsx`) charge GA4/Pixel dès
 * qu'un identifiant est enregistré ET le consentement donné — exactement le
 * même schéma que `CodeSnippets`. Ignorer ces deux réglages ici referait
 * précisément l'erreur que ce module existe pour éviter : un traceur actif
 * sans bandeau pour le demander. Une revue de ce chantier a trouvé ce défaut
 * de conception avant qu'il n'atteigne la production — voir le rapport de la
 * tâche 3.
 *
 * ── SI LA BASE NE RÉPOND PAS ─────────────────────────────────────────────────
 *
 * `getActiveSnippets` intercepte l'erreur et rend une liste vide, `getParametres`
 * fait de même et rend les valeurs par défaut (toutes vides) : dans les deux
 * cas on répond alors « pas de traçage », donc pas de bandeau. Ce n'est PAS un
 * manquement, et il ne faut pas le « corriger » en affichant le bandeau par
 * précaution.
 *
 * La raison tient en une phrase : `CodeSnippets` et `MesureAudience` lisent
 * les MÊMES fonctions, dans le MÊME rendu (mémorisées par `cache()`). Si la
 * lecture échoue, aucun fragment n'est injecté et aucune balise ne se charge
 * non plus — rien ne part, donc il n'y a rien à faire consentir. Les
 * décisions dérivent de la même donnée et ne peuvent pas diverger.
 *
 * Le cas se produit réellement : la base Neon se met en veille et la première
 * requête d'un build peut expirer.
 */
export const tracageActif = cache(async (): Promise<boolean> => {
  const [fragments, parametres] = await Promise.all([getActiveSnippets(), getParametres()]);
  return (
    fragments.some((fragment) => fragment.category !== "necessaire") ||
    Boolean(parametres.ga4) ||
    Boolean(parametres.metaPixel)
  );
});
