import { cache } from "react";
import { prisma } from "@/server/prisma";
import { normaliserParametres, PARAMETRES_PAR_DEFAUT, type ParametresBoutique } from "@/lib/kk/parametres";

/**
 * Réglages de la boutique, côté serveur.
 *
 * Les types, les valeurs par défaut et la normalisation vivent dans
 * `@/lib/kk/parametres`, que le back-office — composant client — peut importer.
 * On les réexporte ici pour que les appelants serveur n'aient qu'un import.
 */
export type { ParametresBoutique, DescriptionChamp } from "@/lib/kk/parametres";
export {
  PARAMETRES_PAR_DEFAUT,
  normaliserParametres,
  saisieEffacee,
  numeroWhatsappValide,
  lienEvaluationValide,
  identifiantGa4Valide,
  identifiantPixelValide,
  CHAMPS_PARAMETRES,
} from "@/lib/kk/parametres";

const CLE_REGLAGES = "boutique.parametres";

/**
 * Réglages en base.
 *
 * Mémoïsé par requête : le numéro WhatsApp est lu par l'en-tête, le pied de page
 * ET le bouton flottant. Sans `cache()`, ce serait trois requêtes par page.
 */
export const getParametres = cache(async (): Promise<ParametresBoutique> => {
  try {
    const ligne = await prisma.setting.findUnique({ where: { key: CLE_REGLAGES } });
    if (!ligne) return { ...PARAMETRES_PAR_DEFAUT };
    return normaliserParametres(JSON.parse(ligne.value));
  } catch {
    // Ligne absente, JSON abîmé, base injoignable : le site garde ses valeurs
    // par défaut plutôt que de tomber. Le numéro WhatsApp est lu sur CHAQUE
    // page ; lever ici les ferait toutes échouer.
    return { ...PARAMETRES_PAR_DEFAUT };
  }
});

/** Enregistre une modification partielle et rend l'état complet résultant. */
export async function saveParametres(
  partiel: Partial<ParametresBoutique>,
): Promise<ParametresBoutique> {
  const actuels = await getParametres();
  const fusion = normaliserParametres({ ...actuels, ...partiel });

  await prisma.setting.upsert({
    where: { key: CLE_REGLAGES },
    create: { key: CLE_REGLAGES, value: JSON.stringify(fusion) },
    update: { value: JSON.stringify(fusion) },
  });
  return fusion;
}

/**
 * Numéro effectivement utilisable, en chiffres.
 *
 * REPLI SUR LA VARIABLE D'ENVIRONNEMENT tant que le réglage est vide. Entre le
 * déploiement de ce sous-lot et la première saisie en administration, le bouton
 * WhatsApp disparaîtrait sinon du site en production.
 *
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` devient morte une fois le réglage saisi, mais
 * elle n'est pas supprimée ici : la retirer pendant que la production tourne
 * encore sur l'ancien code casserait le site entre le déploiement et la
 * propagation.
 */
export function numeroWhatsappEffectif(p: ParametresBoutique): string {
  if (p.whatsapp) return p.whatsapp;
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
}
