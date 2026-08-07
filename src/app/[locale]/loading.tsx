import { getLocale } from "next-intl/server";
import { BrandLoader } from "@/components/kk/brand-loader";

/**
 * Écran d'attente de la boutique.
 *
 * L'App Router affiche ce fichier pendant qu'un segment se prépare : au
 * premier chargement, puis à chaque navigation dont les données ne sont pas
 * déjà en cache. Placé à la racine de `[locale]`, il couvre toutes les pages
 * de la boutique qui n'ont pas de `loading.tsx` propre.
 */

const MESSAGES: Record<string, string> = {
  fr: "Nous préparons votre sélection",
  en: "Preparing your selection",
};

export default async function BoutiqueLoading() {
  // `getLocale()` lit la langue posée par le middleware. Le fallback d'un
  // Suspense peut être rendu avant que la page ait appelé `setRequestLocale` :
  // on retombe donc sur le français, langue de référence du site, plutôt que
  // de faire échouer l'écran d'attente lui-même.
  let locale = "fr";
  try {
    locale = await getLocale();
  } catch {
    /* langue indéterminée : le français fait office de repli */
  }

  return <BrandLoader message={MESSAGES[locale] ?? MESSAGES.fr} />;
}
