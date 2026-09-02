/**
 * Passerelle de paiement CinetPay — Mobile Money et carte, API OAuth v1.
 *
 * Recommandée par le cahier des charges (voir docs/ETAT-DES-LIEUX.md §4) à la
 * place de GeniusPay : couverture Cameroun documentée (Orange Money, MTN
 * MoMo) et XAF accepté nativement — les deux réserves qui bloquaient
 * GeniusPay avant la mise en production.
 *
 * ── LA VARIANTE D'API RÉELLEMENT UTILISÉE ───────────────────────────────────
 *
 * CinetPay expose plusieurs générations d'API. Trois identifiants
 * (`cinetpay_apikey`, `cinetpay_site_id`, `cinetpay_secret_key`) existaient
 * déjà en base depuis un lot précédent, orphelins — voir
 * docs/ETAT-DES-LIEUX.md. Ce ne sont PAS ceux que le tableau de bord du
 * compte marchand réellement ouvert délivre : celui-ci porte un « API Key »
 * (`sk_test_…`) et un « Mot de passe API », soit `api_key`/`api_password`
 * au sens de l'API OAuth documentée ci-dessous — une génération différente,
 * sans site_id ni secret_key. C'est CETTE variante que ce fichier implémente,
 * confirmée par capture d'écran du tableau de bord du compte sandbox
 * (Cameroun) le 02/09/2026. Les trois champs orphelins restent inertes ; à
 * retirer du seed si cette variante se confirme en production (même
 * remarque que pour GeniusPay avant elle).
 *
 * ── LE JETON D'ACCÈS ─────────────────────────────────────────────────────
 *
 * `POST /v1/oauth/login` rend un jeton Bearer. Deux indications
 * contradictoires sur sa durée de vie dans la documentation elle-même :
 * le corps d'exemple porte `expires_in: 86400` (24 h), le texte
 * « Bonnes pratiques » affirme 5 minutes. On ne tranche pas : on fait
 * confiance à la valeur `expires_in` REÇUE à chaque connexion, mise en
 * cache jusqu'à expiration, jamais une constante supposée — même principe
 * que geniuspay.ts face à une documentation qui se contredit.
 *
 * ── POURQUOI LE WEBHOOK NE FAIT PAS AUTORITÉ ────────────────────────────────
 *
 * La documentation CinetPay est explicite, avertissement en tête de la page
 * « Notification » : ne JAMAIS conclure depuis le statut porté par
 * `notify_url` — n'importe qui connaissant l'URL peut forger un faux
 * `status: SUCCESS`. La seule source de vérité est un appel serveur-à-
 * serveur `GET /v1/payment/{merchant_transaction_id}`, authentifié par le
 * jeton Bearer. C'est ce que fait `lirePaiement`, et c'est lui seul que le
 * webhook (`src/app/api/payments/webhook/cinetpay/route.ts`) consulte pour
 * conclure — jamais le corps de la requête entrante.
 */

const BASE_URL_PAR_DEFAUT = "https://api.cinetpay.net";

/** Devise transmise au prestataire — XAF est accepté nativement. */
export const DEVISE_PRESTATAIRE = "XAF";

export interface ConfigCinetPay {
  baseUrl: string;
  /** « API Key » du tableau de bord (compte `api_key`, ex. `sk_test_…`). */
  apiKey: string;
  /** « Mot de passe API » du tableau de bord (compte `api_password`). */
  apiPassword: string;
  /** Indicatif seulement — rien dans leur documentation ne distingue
   *  sandbox et live par le format des identifiants (à la différence de
   *  GeniusPay) : déduit de l'hôte, `api.cinetpay.net` étant celui que leur
   *  documentation nomme explicitement pour le sandbox. */
  environnement: "sandbox" | "live";
}

/**
 * Configuration lue dans l'environnement.
 *
 * Rend `null` si l'une des deux clés manque : le tunnel retombe alors sur
 * GeniusPay s'il est configuré, ou sur la confirmation manuelle par
 * WhatsApp sinon — voir `src/server/kk/paiement.ts`, qui choisit le
 * prestataire actif.
 */
export function lireConfig(): ConfigCinetPay | null {
  const apiKey = process.env.CINETPAY_API_KEY?.trim() ?? "";
  const apiPassword = process.env.CINETPAY_API_PASSWORD?.trim() ?? "";
  if (!apiKey || !apiPassword) return null;

  const baseUrl = (process.env.CINETPAY_BASE_URL?.trim() || BASE_URL_PAR_DEFAUT).replace(/\/+$/, "");
  return { baseUrl, apiKey, apiPassword, environnement: baseUrl.includes("cinetpay.net") ? "sandbox" : "live" };
}

// ---- Jeton d'accès ----

/**
 * Cache en mémoire du jeton — un seul compte actif à la fois dans cette
 * boutique, une entrée suffit. Ne survit pas au redémarrage du processus,
 * ce qui est sans conséquence : la première requête suivante en redemande
 * un.
 */
let jetonCache: { token: string; expireA: number; apiKey: string } | null = null;

/**
 * Jeton Bearer valide, redemandé seulement si le précédent a expiré (ou n'a
 * jamais été obtenu, ou porte sur une autre clé — utile si les variables
 * d'environnement changent sans redémarrage, en développement).
 *
 * Marge de 30 s sous l'expiration annoncée : éviter qu'un jeton tout juste
 * valide à l'obtention expire pendant le trajet réseau de l'appel suivant.
 */
async function jetonValide(config: ConfigCinetPay): Promise<string> {
  const maintenant = Date.now();
  if (jetonCache && jetonCache.apiKey === config.apiKey && jetonCache.expireA > maintenant) {
    return jetonCache.token;
  }

  const reponse = await fetch(`${config.baseUrl}/v1/oauth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ api_key: config.apiKey, api_password: config.apiPassword }),
    signal: AbortSignal.timeout(15_000),
  });

  const texte = await reponse.text();
  if (!reponse.ok) {
    throw new Error(`CinetPay a refusé la connexion (${reponse.status}) : ${texte.slice(0, 300)}`);
  }

  const corps = JSON.parse(texte) as { access_token?: string; expires_in?: number };
  if (!corps.access_token) {
    throw new Error(`Réponse de connexion CinetPay inattendue : ${texte.slice(0, 300)}`);
  }

  const dureeSecondes = Number.isFinite(corps.expires_in) ? Number(corps.expires_in) : 300;
  jetonCache = {
    token: corps.access_token,
    expireA: maintenant + Math.max(dureeSecondes - 30, 30) * 1000,
    apiKey: config.apiKey,
  };
  return jetonCache.token;
}

// ---- Création d'un paiement ----

export interface DemandePaiement {
  /** Montant en FCFA ENTIERS. Aucun centime : voir docs/13 §5.1. */
  montant: number;
  description: string;
  /** Identifiant de transaction, UNIQUE côté CinetPay et limité à 30
   *  caractères d'après leur documentation — voir la construction du
   *  suffixe de reprise dans `src/server/kk/paiement.ts`. */
  orderNumber: string;
  client: { nom: string; email: string; telephone: string };
  urlSucces: string;
  urlEchec: string;
  urlNotification: string;
}

export interface PaiementCree {
  reference: string;
  /** Page de paiement du prestataire, où le client choisit son moyen. */
  urlPaiement: string;
  montant: number;
  statut: string;
  environnement: string;
  devise: string;
  /** Réponse brute, archivée dans `PaymentTransaction.rawResponse`. */
  brut: string;
}

/**
 * Ouvre un paiement et rend l'URL vers laquelle envoyer le client.
 *
 * `payment_method` n'est VOLONTAIREMENT PAS transmis : sans lui, CinetPay
 * affiche tous les moyens disponibles pour le Cameroun sur sa page, et
 * c'est le client qui choisit — jamais le serveur à sa place. Même choix
 * que le mode checkout de GeniusPay.
 */
export async function creerPaiement(
  config: ConfigCinetPay,
  demande: DemandePaiement,
): Promise<PaiementCree> {
  const jeton = await jetonValide(config);
  const [prenom, ...resteDuNom] = demande.client.nom.split(" ");

  const reponse = await fetch(`${config.baseUrl}/v1/payment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jeton}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      currency: DEVISE_PRESTATAIRE,
      merchant_transaction_id: demande.orderNumber,
      amount: demande.montant,
      lang: "fr",
      designation: demande.description.slice(0, 255),
      client_email: demande.client.email,
      client_phone_number: demande.client.telephone,
      // Minimum deux caractères exigé par leur validation ; un prénom seul
      // (nom de famille absent de la commande) retomberait sur une chaîne
      // trop courte et ferait échouer la demande pour une raison qui n'a
      // rien à voir avec le paiement lui-même.
      client_first_name: prenom || "Client",
      client_last_name: resteDuNom.join(" ") || prenom || "KossKoss",
      success_url: demande.urlSucces,
      failed_url: demande.urlEchec,
      notify_url: demande.urlNotification,
    }),
    // Sans délai maximal, une passerelle muette bloquerait la validation de
    // commande jusqu'au timeout de la plateforme.
    signal: AbortSignal.timeout(20_000),
  });

  const texte = await reponse.text();
  if (!reponse.ok) {
    throw new Error(`CinetPay a refusé la demande (${reponse.status}) : ${texte.slice(0, 300)}`);
  }

  const corps = JSON.parse(texte) as {
    code?: number;
    status?: string;
    payment_url?: string;
  };
  // 200/"OK" = création réussie. Le HTTP peut être 200 sans que la demande
  // ait abouti (ex. 422 "TRANSACTION_EXIST" documenté pour un
  // merchant_transaction_id déjà utilisé) : c'est leur code métier qui fait
  // foi, jamais le seul statut HTTP.
  if (corps.code !== 200 || !corps.payment_url) {
    throw new Error(
      `Réponse CinetPay inattendue (${corps.code ?? "?"} ${corps.status ?? ""}) : ${texte.slice(0, 300)}`,
    );
  }

  return {
    reference: demande.orderNumber,
    urlPaiement: corps.payment_url,
    montant: demande.montant,
    statut: "PENDING",
    environnement: config.environnement,
    devise: DEVISE_PRESTATAIRE,
    brut: texte.slice(0, 4000),
  };
}

/**
 * Relit une transaction chez le prestataire — LA source de vérité.
 *
 * Voir l'en-tête de fichier : c'est cet appel, et lui seul, qui conclut un
 * paiement CinetPay, jamais le corps d'une notification reçue.
 */
export async function lirePaiement(
  config: ConfigCinetPay,
  merchantTransactionId: string,
): Promise<{ statut: string; brut: string } | null> {
  const jeton = await jetonValide(config);

  const reponse = await fetch(
    `${config.baseUrl}/v1/payment/${encodeURIComponent(merchantTransactionId)}`,
    {
      headers: { Authorization: `Bearer ${jeton}`, Accept: "application/json" },
      // Sous les 10 s que CinetPay laisse pour répondre à une notification
      // (voir l'en-tête de la route de webhook) : cet appel s'y insère,
      // il doit donc laisser de la marge plutôt que la consommer seul.
      signal: AbortSignal.timeout(7_000),
    },
  );

  if (!reponse.ok) return null;

  const texte = await reponse.text();
  try {
    const corps = JSON.parse(texte) as { status?: unknown };
    return { statut: String(corps.status ?? ""), brut: texte.slice(0, 4000) };
  } catch {
    return null;
  }
}

/** Statuts CinetPay qui valent encaissement. */
export function estEncaisse(statut: string): boolean {
  return statut === "SUCCESS";
}

/**
 * Statuts CinetPay qui valent échec définitif.
 *
 * `INSUFFICIENT_BALANCE` est documenté comme une réponse de statut à part
 * (code 2005) plutôt qu'une simple variante de `FAILED` — mais c'est un
 * refus définitif de l'opérateur, pas un état transitoire : il rejoint donc
 * les échecs plutôt que les statuts « en attente ».
 */
export function estEchoue(statut: string): boolean {
  return statut === "FAILED" || statut === "INSUFFICIENT_BALANCE" || statut === "CANCELLED";
}
