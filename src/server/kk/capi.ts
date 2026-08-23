import { createHash } from "node:crypto";
import { getIntegrationSecret } from "@/server/integrations";
import { getParametres } from "@/server/kk/parametres";
import { CLE_JETON_CAPI } from "@/lib/kk/parametres";
import { versPixel, nomEvenementMeta, type ArticleMesure, type EvenementDetail } from "@/lib/kk/mesure";

/**
 * API de conversions Meta (CAPI), côté serveur — l'événement `purchase`,
 * envoyé au moment où l'ENCAISSEMENT est confirmé (voir l'appelant unique,
 * `appliquerEvenement` dans `src/server/kk/paiement.ts`), jamais à la
 * commande : c'est l'argent reçu qui est la conversion, pas l'intention
 * d'achat.
 *
 * ── RIEN NE PART SANS CONSENTEMENT, ICI NON PLUS ─────────────────────────────
 *
 * Une conversion envoyée depuis le serveur reste une donnée personnelle
 * transmise à un tiers (Meta) : l'article 82 de la loi Informatique et
 * Libertés s'applique exactement comme au Pixel navigateur. `marketingConsent`
 * est le consentement lu à la COMMANDE (voir la colonne du même nom sur
 * `Order`, et le commentaire dans `src/server/kk/checkout.ts`) — la seule
 * valeur disponible ici : ce module tourne depuis un webhook du prestataire de
 * paiement, sans cookie de navigateur à relire.
 *
 * ── LA DÉDUPLICATION AVEC LE PIXEL ────────────────────────────────────────────
 *
 * `versPixel` — le MÊME formatage que celui utilisé par le Pixel navigateur,
 * voir `@/lib/kk/mesure` — calcule `event_id = identifiantEvenement("purchase",
 * orderNumber)`. Navigateur et serveur ne se parlent pas au moment de l'envoi,
 * mais calculent la même chaîne à partir de la même donnée (le numéro de
 * commande) : Meta rapproche les deux et ne compte la vente qu'une fois. Voir
 * le rapport de la tâche 4 pour les deux valeurs relevées côte à côte.
 *
 * ── CE QUI PART, ET POURQUOI ──────────────────────────────────────────────────
 *
 * `custom_data` : les mêmes value/currency/content_ids/contents que le Pixel —
 * aucune donnée personnelle, seulement des références produit et des montants.
 *
 * `user_data` : SEULEMENT l'e-mail et le téléphone, et JAMAIS en clair — Meta
 * exige un hachage SHA-256 pour rapprocher un événement d'un compte
 * publicitaire (`em`/`ph`, les seuls champs `user_data` utilisés ici). Ni nom
 * ni adresse : ces champs existent dans les specs Meta (`fn`, `ln`, `ct`,
 * `zp`...) mais rien ne les exige pour qu'un achat soit compté, et le principe
 * de minimisation (art. 5 §1 c RGPD) interdit de les envoyer par confort.
 *
 * ── UN ÉCHEC N'INTERROMPT JAMAIS L'ENCAISSEMENT ──────────────────────────────
 *
 * `envoyerAchatCapi` n'est jamais laissée lever : jeton invalide, dataset
 * inconnu, Meta indisponible... tout est journalisé et avalé. Une conversion
 * perdue est un désagrément statistique ; une commande qui échoue parce que
 * Meta a mal répondu serait un incident, et ce module ne peut pas en être la
 * cause.
 */

export interface AchatCapi {
  orderNumber: string;
  email: string;
  phone: string;
  articles: ArticleMesure[];
  totalCents: number;
  /** Consentement « marketing », figé à la commande — voir l'en-tête. */
  marketingConsent: boolean;
}

/** Exporté pour les tests, qui vérifient le hachage plutôt que de le supposer. */
export function hacherSha256(valeur: string): string {
  return createHash("sha256").update(valeur).digest("hex");
}

/**
 * `user_data` minimal : seulement ce que Meta accepte pour rapprocher
 * l'événement d'un compte publicitaire, et seulement haché — voir l'en-tête
 * du fichier. Un champ vide (client sans e-mail renseigné, improbable mais
 * possible) est omis plutôt que haché à vide, ce qui produirait une empreinte
 * bidon que Meta ne rapprocherait jamais de rien.
 */
export function donneesUtilisateur(email: string, phone: string): { em?: string[]; ph?: string[] } {
  const donnees: { em?: string[]; ph?: string[] } = {};

  const emailNormalise = email.trim().toLowerCase();
  if (emailNormalise) donnees.em = [hacherSha256(emailNormalise)];

  // Chiffres seuls, sans "+" ni espace : le format que Meta documente pour `ph`.
  const telephoneNormalise = phone.replace(/\D/g, "");
  if (telephoneNormalise) donnees.ph = [hacherSha256(telephoneNormalise)];

  return donnees;
}

const VERSION_GRAPH = "v21.0";

/**
 * Envoie l'événement `purchase` à la CAPI Meta. N'envoie RIEN, et ne lève
 * jamais, si l'une de ces conditions manque : consentement marketing,
 * identifiant du jeu de données configuré, jeton enregistré.
 */
export async function envoyerAchatCapi(achat: AchatCapi): Promise<void> {
  try {
    // Deux conditions, comme au navigateur (voir mesureNavigateur.ts) :
    // consentement ET configuration. Le consentement d'abord — inutile de lire
    // le jeton chiffré pour un envoi qui ne partira de toute façon pas.
    if (!achat.marketingConsent) return;

    const [parametres, jeton] = await Promise.all([
      getParametres(),
      getIntegrationSecret(CLE_JETON_CAPI),
    ]);
    if (!parametres.metaCapiDatasetId || !jeton) return;

    const detail: EvenementDetail = {
      type: "purchase",
      reference: achat.orderNumber,
      articles: achat.articles,
      totalCents: achat.totalCents,
    };
    // Même fonction que le Pixel navigateur (`@/lib/kk/mesureNavigateur`) :
    // `event_id` en est extrait pour porter le champ CAPI de même nom, le
    // reste (`value`, `currency`, `content_ids`, `contents`...) devient
    // `custom_data` tel quel.
    const { event_id, ...customData } = versPixel(detail);

    const corps = {
      data: [
        {
          event_name: nomEvenementMeta("purchase"),
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          action_source: "website",
          user_data: donneesUtilisateur(achat.email, achat.phone),
          custom_data: customData,
        },
      ],
    };

    const url = `https://graph.facebook.com/${VERSION_GRAPH}/${encodeURIComponent(parametres.metaCapiDatasetId)}/events?access_token=${encodeURIComponent(jeton)}`;
    const reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    if (!reponse.ok) {
      // Le corps de la réponse peut porter le jeton en échange (test invalide,
      // "access token" cité tel quel par l'API Meta) : tronqué à 500
      // caractères plutôt qu'omis, pour rester diagnosticable sans risquer de
      // journaliser une réponse démesurée.
      const texte = await reponse.text().catch(() => "");
      console.error(
        `[capi] Meta a refusé l'événement ${event_id} pour la commande ${achat.orderNumber} (HTTP ${reponse.status}) : ${texte.slice(0, 500)}`,
      );
    }
  } catch (erreur) {
    // Jeton invalide, dataset introuvable, Meta indisponible, réseau coupé…
    // tout atterrit ici. Voir l'en-tête du fichier : ce module ne doit JAMAIS
    // faire échouer l'encaissement qui l'appelle.
    console.error(`[capi] envoi impossible pour la commande ${achat.orderNumber}`, erreur);
  }
}
