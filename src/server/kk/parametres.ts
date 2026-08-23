import { cache } from "react";
import { prisma } from "@/server/prisma";
import { normaliserParametres, PARAMETRES_PAR_DEFAUT, CLE_JETON_CAPI, jetonCapiValide, type ParametresBoutique } from "@/lib/kk/parametres";
import { getIntegration, setIntegrationSecret } from "@/server/integrations";

/**
 * Réglages de la boutique, côté serveur.
 *
 * Les types, les valeurs par défaut et la normalisation vivent dans
 * `@/lib/kk/parametres`, que le back-office — composant client — peut importer.
 * On les réexporte ici pour que les appelants serveur n'aient qu'un import.
 *
 * Seul ce dont un appelant serveur se sert est réexporté : les cinq
 * validateurs individuels de `ParametresBoutique` s'atteignent par
 * `CHAMPS_PARAMETRES`, personne ne les nomme un par un. `jetonCapiValide` fait
 * exception : la route d'enregistrement doit l'appeler explicitement, le jeton
 * n'étant justement PAS un champ de `CHAMPS_PARAMETRES` (voir plus bas).
 */
export type { ParametresBoutique } from "@/lib/kk/parametres";
export {
  PARAMETRES_PAR_DEFAUT,
  normaliserParametres,
  saisieEffacee,
  CHAMPS_PARAMETRES,
  jetonCapiValide,
} from "@/lib/kk/parametres";

const CLE_REGLAGES = "boutique.parametres";

/**
 * Réglages en base.
 *
 * Mémoïsé par requête : le numéro WhatsApp est lu par le pied de page ET le
 * bouton flottant du gabarit — donc deux fois sur chaque page de la boutique —
 * et une troisième fois par la page de confirmation de commande. Sans
 * `cache()`, ce serait autant de requêtes. L'en-tête, lui, ne le lit pas.
 */
export const getParametres = cache(async (): Promise<ParametresBoutique> => {
  try {
    const ligne = await prisma.setting.findUnique({ where: { key: CLE_REGLAGES } });
    if (!ligne) return { ...PARAMETRES_PAR_DEFAUT };
    return normaliserParametres(JSON.parse(ligne.value));
  } catch {
    // Ligne absente, JSON abîmé, base injoignable : le site garde ses valeurs
    // par défaut plutôt que de tomber. Le pied de page conclut CHAQUE page et
    // lit ce réglage ; lever ici les ferait toutes échouer.
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

/**
 * Le jeton CAPI, comme les clés des passerelles de paiement : chiffré dans
 * `Integration`, jamais dans la ligne `Setting` de `ParametresBoutique`. Ce
 * module s'assure que la ligne existe avant toute lecture ou écriture — sans
 * quoi `setIntegrationSecret` (voir `@/server/integrations`) rendrait
 * silencieusement `undefined`, exactement comme `ensureGatewayIntegrations`
 * le fait déjà pour les passerelles de paiement.
 */
async function ensureCapiIntegration(): Promise<void> {
  await prisma.integration.upsert({
    where: { key: CLE_JETON_CAPI },
    update: {},
    create: {
      key: CLE_JETON_CAPI,
      label: "Jeton API de conversions Meta (CAPI)",
      description:
        "Jeton d'accès système, utilisé pour envoyer les achats confirmés à l'API de conversions Meta sans passer par le navigateur.",
      enabled: false,
    },
  });
}

/**
 * Le jeton CAPI est-il enregistré ? Ne rend JAMAIS la valeur — seulement
 * « configuré » ou « non configuré », comme l'écran des passerelles de
 * paiement le fait déjà pour leurs clés.
 */
export async function jetonCapiConfigure(): Promise<boolean> {
  await ensureCapiIntegration();
  const integration = await getIntegration(CLE_JETON_CAPI);
  return integration?.configured ?? false;
}

/**
 * Enregistre un nouveau jeton CAPI, chiffré. Lève si le format ne correspond
 * pas à `jetonCapiValide` — c'est à l'appelant de traduire ça en réponse 400.
 *
 * N'accepte jamais la chaîne vide : un champ vide dans le formulaire signifie
 * « ne pas toucher au jeton », pas « effacer le jeton ». C'est à l'appelant de
 * ne PAS invoquer cette fonction quand le champ est vide (voir la route
 * d'enregistrement) — la répéter ici serait une seconde source de vérité pour
 * la même règle.
 */
export async function enregistrerJetonCapi(jeton: string, actor?: string): Promise<void> {
  if (!jetonCapiValide(jeton)) {
    throw new Error("format_invalide:capiToken");
  }
  await ensureCapiIntegration();
  await setIntegrationSecret(CLE_JETON_CAPI, jeton, actor);
}
