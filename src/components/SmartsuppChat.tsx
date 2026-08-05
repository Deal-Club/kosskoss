import { getLocale } from "next-intl/server";
import { SmartsuppLauncher } from "@/components/SmartsuppLauncher";

/**
 * Chat en direct Smartsupp, en bas à droite de la boutique.
 *
 * Rien n'est rendu tant que la clé n'est pas fournie via
 * NEXT_PUBLIC_SMARTSUPP_KEY : pas de bouton mort en développement, activation
 * par simple variable d'environnement en production. Attention, c'est une
 * variable `NEXT_PUBLIC_` : elle est figée dans le bundle à la compilation, un
 * redémarrage sans reconstruction ne la prend pas en compte.
 *
 * La clé se trouve dans le tableau de bord Smartsupp, rubrique « Paramètres →
 * Chat box → Code d'installation » (valeur après `_smartsupp.key`).
 *
 * Ce composant ne fait que résoudre la langue et le libellé côté serveur ; le
 * chargement effectif, déclenché par le visiteur, est dans
 * `SmartsuppLauncher` — voir son en-tête pour la raison du chargement au clic.
 *
 * Les libellés sont passés en propriété plutôt que lus dans les fichiers de
 * messages : deux chaînes ne justifient pas d'élargir le dictionnaire, et les
 * pages légales voisines suivent déjà ce procédé.
 */
export async function SmartsuppChat() {
  const key = process.env.NEXT_PUBLIC_SMARTSUPP_KEY;
  if (!key) return null;

  const locale = await getLocale();
  // Le tableau de bord Smartsupp n'attend que le code court de la langue.
  const language = locale === "en" ? "en" : "fr";
  const label = locale === "en" ? "Chat with us" : "Discuter avec nous";

  return <SmartsuppLauncher chatKey={key} language={language} label={label} />;
}
