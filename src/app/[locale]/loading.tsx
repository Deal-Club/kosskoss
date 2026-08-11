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

/**
 * La phrase d'attente dit le positionnement, pas l'attente.
 *
 * « Nous préparons votre sélection » décrivait ce que la machine était en
 * train de faire — une information dont personne n'a l'usage. Ces deux ou
 * trois secondes sont le seul moment où le visiteur n'a rien d'autre à
 * regarder : autant qu'elles disent ce que la maison propose.
 *
 * « À chaque peau, sa solution » tient la promesse en quatre mots : un besoin
 * particulier, une réponse qui lui correspond. C'est la démarche du site —
 * on part du problème, on remonte vers le soin — et non une promesse de
 * résultat, qui n'aurait rien à faire ici.
 */
const MESSAGES: Record<string, string> = {
  fr: "À chaque peau, sa solution",
  en: "Every skin has its answer",
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
