import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Passerelle de paiement GeniusPay — Mobile Money et carte.
 *
 * Documentation fournie par le prestataire : `API_Documentation.md` et
 * `geniuspay-webhook-integration-guide.md`.
 *
 * ── TROIS RÉSERVES À LEVER AVANT LA PRODUCTION ──────────────────────────────
 *
 * 1. COUVERTURE PAYS. La documentation liste Wave et Orange Money pour SN, CI,
 *    ML, BF, et MTN pour CI, BF. Le Cameroun n'y figure pas. La boutique vend
 *    au Cameroun : la disponibilité d'Orange Money CM et de MTN MoMo CM est à
 *    confirmer auprès de GeniusPay avant d'ouvrir le mode live.
 *
 * 2. DEVISE : LEUR API REFUSE LE XAF. Vérifié en sandbox — `currency: "XAF"`
 *    renvoie 422 `validation.in`. Seul le XOF (franc CFA UEMOA) est accepté,
 *    alors que la boutique vend en XAF (franc CFA CEMAC).
 *
 *    Les deux francs sont à parité fixe — 1 XOF = 1 XAF, tous deux arrimés à
 *    l'euro à 655,957 — donc le MONTANT transite juste. Mais l'encaissement
 *    sera libellé en XOF chez le prestataire pendant que la boutique affiche
 *    des XAF : c'est un point à valider avec le comptable, et à confirmer avec
 *    GeniusPay avant d'ouvrir le mode live.
 *
 * 3. URL EN CLAIR. Leur base est documentée en `http://`. Envoyer une clé
 *    secrète sur un canal non chiffré est inacceptable. Vérifié : leur hôte
 *    répond correctement en `https://`, qui est donc le défaut ci-dessous.
 *
 * ── DEUX DOCUMENTATIONS QUI SE CONTREDISENT ─────────────────────────────────
 *
 * Sur la signature des webhooks, les deux fichiers divergent :
 *   — `API_Documentation.md` : en-tête `X-GeniusPay-Signature`, signature
 *     calculée sur le corps SEUL ;
 *   — le guide d'intégration (plus récent, 30/12/2025) : en-tête
 *     `X-Webhook-Signature`, signature sur `timestamp + "." + corps`.
 *
 * On ne choisit pas : `verifierSignature` accepte les deux en-têtes et essaie
 * les deux formules. Deviner lequel est à jour reviendrait à laisser passer
 * tous les webhooks le jour où on se trompe, ou à les rejeter tous.
 */

const BASE_URL_PAR_DEFAUT = "https://pay.genius.ci/api/v1/merchant";

/** Montant minimal accepté par le prestataire, en francs CFA. */
export const MONTANT_MINIMUM = 200;

/**
 * Devise transmise au prestataire.
 *
 * XOF et non XAF : leur API refuse le XAF (422 `validation.in`, vérifié en
 * sandbox). Parité fixe entre les deux, donc le montant est identique — voir
 * la réserve n°2 en tête de fichier.
 */
export const DEVISE_PRESTATAIRE = "XOF";

export interface ConfigGeniusPay {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  /** Déduit du préfixe des clés : `pk_live_…` ou `pk_sandbox_…`. */
  environnement: "sandbox" | "live";
}

/**
 * Configuration lue dans l'environnement.
 *
 * Rend `null` si les clés manquent : le tunnel retombe alors sur la
 * confirmation manuelle par WhatsApp plutôt que d'échouer. Une boutique sans
 * clé de paiement doit continuer à prendre des commandes.
 */
export function lireConfig(): ConfigGeniusPay | null {
  const apiKey = process.env.GENIUSPAY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.GENIUSPAY_API_SECRET?.trim() ?? "";
  if (!apiKey || !apiSecret) return null;

  const baseUrl = (process.env.GENIUSPAY_BASE_URL?.trim() || BASE_URL_PAR_DEFAUT).replace(/\/+$/, "");

  return {
    baseUrl,
    apiKey,
    apiSecret,
    webhookSecret: process.env.GENIUSPAY_WEBHOOK_SECRET?.trim() ?? "",
    // Le préfixe de la clé publique fait foi : c'est le prestataire qui la
    // délivre, on ne peut pas se tromper d'environnement en recopiant un
    // drapeau à la main.
    environnement: apiKey.startsWith("pk_live_") ? "live" : "sandbox",
  };
}

// ---- Création d'un paiement ----

export interface DemandePaiement {
  /** Montant en FCFA ENTIERS. Aucun centime : voir docs/13 §5.1. */
  montant: number;
  description: string;
  /** Numéro de commande, retourné tel quel par le webhook via `metadata`. */
  orderNumber: string;
  client: { nom: string; email: string; telephone: string };
  urlSucces: string;
  urlEchec: string;
}

export interface PaiementCree {
  reference: string;
  /** Page de paiement du prestataire, où le client choisit son moyen. */
  urlPaiement: string;
  montant: number;
  frais: number;
  net: number;
  statut: string;
  environnement: string;
  /** Devise réellement retenue par le prestataire. */
  devise: string;
  /** Réponse brute, archivée dans `PaymentTransaction.rawResponse`. */
  brut: string;
}

/**
 * Ouvre un paiement et rend l'URL vers laquelle envoyer le client.
 *
 * `payment_method` n'est VOLONTAIREMENT PAS transmis : c'est le mode
 * « checkout » recommandé par le prestataire, où le client choisit son moyen
 * sur leur page. Le forcer côté serveur reviendrait à décider à sa place entre
 * Orange Money, MTN et la carte — et à perdre celui qui n'a pas le moyen
 * imposé.
 */
export async function creerPaiement(
  config: ConfigGeniusPay,
  demande: DemandePaiement,
): Promise<PaiementCree> {
  if (!Number.isInteger(demande.montant) || demande.montant < MONTANT_MINIMUM) {
    throw new Error(
      `Montant invalide : ${demande.montant}. Le minimum accepté est ${MONTANT_MINIMUM} FCFA.`,
    );
  }

  const reponse = await fetch(`${config.baseUrl}/payments`, {
    method: "POST",
    headers: {
      "X-API-Key": config.apiKey,
      "X-API-Secret": config.apiSecret,
      "Content-Type": "application/json",
      // Indispensable : leur back-end est un Laravel, et SANS cet en-tête il
      // rend ses erreurs en PAGE HTML au lieu de JSON. Le parseur tombait alors
      // sur « <!DOCTYPE » et masquait le vrai message du prestataire.
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: demande.montant,
      currency: DEVISE_PRESTATAIRE,
      description: demande.description.slice(0, 500),
      customer: {
        name: demande.client.nom,
        email: demande.client.email,
        phone: demande.client.telephone,
      },
      success_url: demande.urlSucces,
      error_url: demande.urlEchec,
      // C'est ce que le webhook nous renverra pour retrouver la commande.
      metadata: { order_id: demande.orderNumber },
    }),
    // Sans délai maximal, une passerelle muette bloquerait la validation de
    // commande jusqu'au timeout de la plateforme.
    signal: AbortSignal.timeout(20_000),
  });

  const texte = await reponse.text();
  if (!reponse.ok) {
    throw new Error(`GeniusPay a refusé la demande (${reponse.status}) : ${texte.slice(0, 300)}`);
  }

  const corps = JSON.parse(texte) as {
    success?: boolean;
    data?: Record<string, unknown>;
  };
  const data = corps.data;
  if (!corps.success || !data) {
    throw new Error(`Réponse GeniusPay inattendue : ${texte.slice(0, 300)}`);
  }

  // Le mode checkout rend `checkout_url`, le mode direct `payment_url`. On
  // accepte les deux : basculer de l'un à l'autre ne doit pas casser le tunnel.
  const url =
    typeof data.checkout_url === "string"
      ? data.checkout_url
      : typeof data.payment_url === "string"
        ? data.payment_url
        : "";
  if (!url) {
    throw new Error(`GeniusPay n'a rendu aucune URL de paiement : ${texte.slice(0, 300)}`);
  }

  return {
    reference: String(data.reference ?? ""),
    urlPaiement: url,
    montant: nombre(data.amount, demande.montant),
    frais: nombre(data.fees, 0),
    net: nombre(data.net_amount, 0),
    // Le sandbox rend `status: null` là où leur documentation annonce
    // « pending ». On normalise plutôt que de propager un « null » en base.
    statut: typeof data.status === "string" && data.status ? data.status : "pending",
    environnement: String(data.environment ?? config.environnement),
    devise: typeof data.currency === "string" ? data.currency : DEVISE_PRESTATAIRE,
    brut: texte.slice(0, 4000),
  };
}

/**
 * Relit une transaction chez le prestataire.
 *
 * Sert de filet quand un webhook s'est perdu : le retour du client sur la page
 * de confirmation peut déclencher cette vérification. On ne se fie JAMAIS au
 * seul retour navigateur pour marquer « payée » — c'est cette lecture-ci qui
 * fait foi, pas le fait que le client soit revenu.
 */
export async function lirePaiement(
  config: ConfigGeniusPay,
  reference: string,
): Promise<{ statut: string; brut: string } | null> {
  const reponse = await fetch(`${config.baseUrl}/payments/${encodeURIComponent(reference)}`, {
    headers: {
      "X-API-Key": config.apiKey,
      "X-API-Secret": config.apiSecret,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!reponse.ok) return null;

  const texte = await reponse.text();
  try {
    const corps = JSON.parse(texte) as { data?: { status?: unknown } };
    return { statut: String(corps.data?.status ?? ""), brut: texte.slice(0, 4000) };
  } catch {
    return null;
  }
}

// ---- Webhooks ----

/**
 * Vérifie la signature d'un webhook.
 *
 * Les deux documentations du prestataire se contredisent sur la formule (voir
 * l'en-tête de ce fichier). On essaie donc les deux, et le webhook n'est
 * accepté que si l'une correspond exactement.
 *
 * La comparaison passe par `timingSafeEqual`, jamais par `===` : une égalité
 * de chaînes s'arrête au premier caractère différent, et ce temps de réponse
 * suffit à reconstituer une signature valide octet par octet.
 */
export function verifierSignature(
  corpsBrut: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const candidats = [
    // Guide d'intégration du 30/12/2025 : timestamp + "." + corps.
    `${timestamp}.${corpsBrut}`,
    // API_Documentation.md : le corps seul.
    corpsBrut,
  ];

  return candidats.some((donnees) => {
    const attendue = createHmac("sha256", secret).update(donnees, "utf8").digest("hex");
    return comparaisonConstante(attendue, signature);
  });
}

/**
 * Comparaison à temps constant, tolérante aux longueurs différentes.
 *
 * `timingSafeEqual` LÈVE une exception si les deux tampons n'ont pas la même
 * taille — c'est le piège de l'exemple Node de leur documentation, qui plante
 * au lieu de refuser proprement une signature tronquée.
 */
function comparaisonConstante(a: string, b: string): boolean {
  const tamponA = Buffer.from(a, "utf8");
  const tamponB = Buffer.from(b, "utf8");
  if (tamponA.length !== tamponB.length) return false;
  return timingSafeEqual(tamponA, tamponB);
}

/** Tolérance de rejeu, en secondes. Valeur retenue par leur documentation. */
export const TOLERANCE_HORODATAGE_SECONDES = 300;

/**
 * L'horodatage est-il assez récent ?
 *
 * Protection contre le rejeu : une requête capturée puis renvoyée des heures
 * plus tard porte une signature toujours valide, mais un horodatage périmé.
 */
export function horodatageAcceptable(timestamp: string, maintenant = Date.now()): boolean {
  const envoye = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(envoye)) return false;
  const ecart = Math.abs(Math.floor(maintenant / 1000) - envoye);
  return ecart <= TOLERANCE_HORODATAGE_SECONDES;
}

/** Statuts GeniusPay qui valent encaissement. */
export function estEncaisse(statut: string): boolean {
  return statut === "completed";
}

/** Statuts GeniusPay qui valent échec définitif. */
export function estEchoue(statut: string): boolean {
  return statut === "failed" || statut === "cancelled" || statut === "expired";
}

function nombre(valeur: unknown, defaut: number): number {
  const n = typeof valeur === "number" ? valeur : Number.parseFloat(String(valeur ?? ""));
  return Number.isFinite(n) ? Math.round(n) : defaut;
}
