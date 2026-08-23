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
 * commande) : Meta rapproche les deux et ne compte la vente qu'une fois.
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
 * ── LE JETON NE VOYAGE JAMAIS DANS UNE ADRESSE ────────────────────────────────
 *
 * `access_token` part dans le CORPS JSON de la requête, jamais en paramètre de
 * l'URL — Meta accepte les deux, mais une adresse peut se retrouver
 * journalisée par un outillage qu'on ne maîtrise pas (mandataire,
 * instrumentation, redirection avec `Referer`), alors qu'un corps de requête
 * POST ne l'est jamais par construction. Tout texte journalisé par ce module
 * (réponse Meta, erreur capturée) passe en plus par `masquerJeton` avant
 * `console.error` : si le jeton devait malgré tout apparaître dans un message
 * d'erreur renvoyé par Meta, il n'atteindrait jamais les journaux en clair.
 *
 * ── TROIS SECONDES, PAS CINQ MINUTES ──────────────────────────────────────────
 *
 * L'appel réseau porte un `AbortSignal.timeout` : sans lui, un Meta qui ne
 * répond jamais laisserait la fonction bloquée jusqu'au délai maximal de la
 * plateforme d'exécution (jusqu'à cinq minutes). Aucune commande n'est perdue
 * dans ce cas — les écritures précèdent cet appel — mais le webhook qui nous a
 * appelés serait tué avant de marquer l'événement comme traité, et resterait
 * indéfiniment au statut « reçu » pour une commande pourtant encaissée.
 *
 * ── UN ÉCHEC N'INTERROMPT JAMAIS L'ENCAISSEMENT ──────────────────────────────
 *
 * `envoyerAchatCapi` n'est jamais laissée lever : jeton invalide, dataset
 * inconnu, Meta indisponible, délai dépassé... tout est journalisé et avalé.
 * Une conversion perdue est un désagrément statistique ; une commande qui
 * échoue parce que Meta a mal répondu serait un incident, et ce module ne peut
 * pas en être la cause.
 *
 * ── POURQUOI LES DÉPENDANCES SONT INJECTABLES ────────────────────────────────
 *
 * `getParametres`/`getIntegrationSecret` tirent Prisma ; en test, sans
 * `DATABASE_URL`, ils LÈVENT — et le `catch` englobant de cette fonction avale
 * cette erreur avant même d'atteindre `fetch`. Un test qui se contente
 * d'espionner `fetch` global et vérifie qu'il n'a jamais été appelé « passe »
 * alors dans TOUS les cas, y compris si la garde de consentement disparaît :
 * ce n'est plus elle qui empêche l'appel, c'est l'absence de base. Recevoir
 * ces trois dépendances en paramètre (avec les implémentations réelles en
 * valeur par défaut) permet aux tests de fournir des dépendances FICTIVES MAIS
 * VALIDES — dataset et jeton renseignés, réseau qui répondrait 200 — de sorte
 * que la SEULE chose encore capable d'empêcher l'appel à `fetch` soit la garde
 * de consentement elle-même. Voir `capi.test.ts`.
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

/** Meta qui ne répond jamais ne doit pas retenir l'appelant au-delà de ce délai — voir l'en-tête. */
export const DELAI_CAPI_MS = 3000;

/**
 * Dépendances de `envoyerAchatCapi`, injectables pour les tests — voir
 * l'en-tête du fichier. Les valeurs par défaut (plus bas) sont les
 * implémentations réelles ; seuls les tests fournissent autre chose.
 */
export interface DependancesCapi {
  getParametres: () => Promise<{ metaCapiDatasetId: string }>;
  getIntegrationSecret: (cle: string) => Promise<string | null>;
  fetch: typeof fetch;
}

// Résolution dynamique de `fetch` à chaque appel (et non capturée une fois à
// l'import) : un test qui remplace `globalThis.fetch` doit être vu, même s'il
// le fait après le chargement de ce module.
const dependancesParDefaut: DependancesCapi = {
  getParametres,
  getIntegrationSecret,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

/**
 * Remplace toute occurrence du jeton par un masque avant de journaliser un
 * texte. Appelé sur la réponse Meta et sur toute erreur capturée : voir
 * l'en-tête du fichier.
 */
export function masquerJeton(texte: string, jeton: string | null): string {
  return jeton ? texte.split(jeton).join("[jeton masqué]") : texte;
}

/** Représentation textuelle d'une erreur capturée, avant masquage. */
function texteErreur(erreur: unknown): string {
  if (erreur instanceof Error) return erreur.stack ?? erreur.message;
  return String(erreur);
}

/**
 * Envoie l'événement `purchase` à la CAPI Meta. N'envoie RIEN, et ne lève
 * jamais, si l'une de ces conditions manque : consentement marketing,
 * identifiant du jeu de données configuré, jeton enregistré.
 */
export async function envoyerAchatCapi(
  achat: AchatCapi,
  dependances: DependancesCapi = dependancesParDefaut,
): Promise<void> {
  // Connu dès sa lecture, utilisé jusque dans le `catch` : c'est ce qui permet
  // de masquer le jeton dans une erreur survenant APRÈS sa lecture (échec
  // réseau, réponse Meta qui le citerait). `null` tant qu'il n'a pas encore
  // été lu : rien à masquer dans ce cas, `masquerJeton` est un no-op.
  let jeton: string | null = null;
  try {
    // Deux conditions, comme au navigateur (voir mesureNavigateur.ts) :
    // consentement ET configuration. Le consentement d'abord — inutile de lire
    // le jeton chiffré pour un envoi qui ne partira de toute façon pas.
    if (!achat.marketingConsent) return;

    const [parametres, jetonLu] = await Promise.all([
      dependances.getParametres(),
      dependances.getIntegrationSecret(CLE_JETON_CAPI),
    ]);
    jeton = jetonLu;
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
      // Dans le corps, jamais dans l'adresse — voir l'en-tête du fichier.
      access_token: jeton,
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

    const url = `https://graph.facebook.com/${VERSION_GRAPH}/${encodeURIComponent(parametres.metaCapiDatasetId)}/events`;
    const reponse = await dependances.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
      // Voir l'en-tête du fichier : Meta qui ne répond jamais ne doit pas
      // retenir le webhook appelant au-delà de ce délai.
      signal: AbortSignal.timeout(DELAI_CAPI_MS),
    });

    if (!reponse.ok) {
      // Le corps de la réponse peut porter le jeton en écho (test invalide,
      // "access token" cité tel quel par l'API Meta) : tronqué à 500
      // caractères ET masqué plutôt qu'omis, pour rester diagnosticable sans
      // risquer de journaliser une réponse démesurée ni le jeton en clair.
      const texte = await reponse.text().catch(() => "");
      console.error(
        masquerJeton(
          `[capi] Meta a refusé l'événement ${event_id} pour la commande ${achat.orderNumber} (HTTP ${reponse.status}) : ${texte.slice(0, 500)}`,
          jeton,
        ),
      );
    } else {
      // Un HTTP 200 n'est PAS une preuve que l'événement a été reçu : Meta
      // répond parfois 200 avec `events_received: 0` (corps mal formé,
      // événement rejeté après coup) — un succès HTTP qui masquerait une perte
      // silencieuse si on s'y arrêtait. `events_received` absent ou non
      // numérique compte comme une réponse qu'on ne sait pas interpréter : on
      // le signale plutôt que de le supposer réussi.
      const corpsReponse = await reponse
        .json()
        .catch(() => null as { events_received?: unknown } | null);
      const recus = corpsReponse && typeof corpsReponse === "object" ? corpsReponse.events_received : undefined;
      if (typeof recus !== "number" || recus < 1) {
        console.error(
          masquerJeton(
            `[capi] Meta a répondu HTTP 200 sans confirmer la réception de l'événement ${event_id} pour la commande ${achat.orderNumber} (events_received=${String(recus)})`,
            jeton,
          ),
        );
      }
    }
  } catch (erreur) {
    // Jeton invalide, dataset introuvable, Meta indisponible, délai dépassé,
    // réseau coupé… tout atterrit ici. Voir l'en-tête du fichier : ce module
    // ne doit JAMAIS faire échouer l'encaissement qui l'appelle, et ne doit
    // JAMAIS journaliser le jeton en clair même si l'erreur le citait.
    console.error(
      masquerJeton(
        `[capi] envoi impossible pour la commande ${achat.orderNumber} : ${texteErreur(erreur)}`,
        jeton,
      ),
    );
  }
}
