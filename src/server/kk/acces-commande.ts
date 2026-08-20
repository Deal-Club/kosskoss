import { cookies } from "next/headers";

/**
 * Preuve d'accès à une commande, hors de l'URL.
 *
 * ── POURQUOI CE MODULE EXISTE ───────────────────────────────────────────────
 *
 * La page de confirmation doit prouver que le visiteur a le droit de lire CETTE
 * commande, sans quoi son numéro suffirait à lire celle du voisin. La preuve
 * était le jeton `accessToken`, passé en `?t=` dans l'adresse.
 *
 * Tant que cette adresse restait entre le navigateur et nous, le risque était
 * mesuré. Le branchement de la passerelle a tout changé : l'URL de retour est
 * CONFIÉE AU PRESTATAIRE, qui l'enregistre, la rend dans ses réponses d'API et
 * l'écrit dans ses journaux. Le jeton se retrouvait alors chez un tiers, dans
 * l'historique du navigateur, et dans l'en-tête `Referer` de toute requête
 * partant de la page de confirmation.
 *
 * Le jeton voyage donc désormais dans un cookie que le JavaScript de la page ne
 * peut pas lire.
 *
 * ── CE QUI EST CONSERVÉ, ET POURQUOI ────────────────────────────────────────
 *
 * Le paramètre `?t=` reste accepté par la page de confirmation. Il sert les
 * accès qui ne passent pas par le navigateur d'achat : un lien de suivi envoyé
 * par e-mail, une commande rouverte depuis un autre appareil. Le supprimer
 * casserait ces parcours ; l'important est qu'il ne soit plus la voie NORMALE,
 * ni celle qu'on donne à un tiers.
 */

/** Un cookie par commande : ouvrir une seconde commande n'écrase pas la première. */
function nomCookie(orderNumber: string): string {
  return `kk_cmd_${orderNumber.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

/**
 * Durée de vie : deux heures.
 *
 * Assez pour couvrir un paiement Mobile Money interrompu — recherche du
 * téléphone, code reçu en retard, reprise — et assez court pour qu'un poste
 * partagé ne garde pas la commande consultable toute la journée. Au-delà, le
 * client passe par son espace client ou par le lien reçu par e-mail.
 */
const DUREE_SECONDES = 60 * 60 * 2;

/** Pose la preuve d'accès pour cette commande. */
export async function poserAccesCommande(orderNumber: string, accessToken: string): Promise<void> {
  const store = await cookies();
  store.set(nomCookie(orderNumber), accessToken, {
    // Inaccessible au JavaScript : ni une extension ni un script tiers injecté
    // dans la page ne peuvent le lire.
    httpOnly: true,
    // `lax` et non `strict` : le retour depuis la page de paiement est une
    // navigation de premier niveau venue d'un autre domaine. En `strict`, le
    // cookie ne serait pas envoyé et la confirmation resterait vide — le bogue
    // qu'on vient précisément de corriger.
    sameSite: "lax",
    // En clair seulement en développement local, où il n'y a pas de TLS.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SECONDES,
  });
}

/** Lit la preuve d'accès, si elle est présente. */
export async function lireAccesCommande(orderNumber: string): Promise<string | null> {
  const store = await cookies();
  return store.get(nomCookie(orderNumber))?.value ?? null;
}
