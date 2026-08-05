/**
 * Adaptateur Square — encaissement par lien de paiement hébergé (Checkout API).
 *
 * Même principe que Stripe : la page de paiement est hébergée par Square, aucune
 * donnée de carte ne transite par ce serveur, et la vérité du paiement vient du
 * webhook signé — jamais de la redirection de retour, que le client peut ne
 * jamais suivre.
 *
 * Rattachement commande ↔ paiement : le lien de paiement est créé avec un objet
 * `order` portant `referenceId = MLC-AAAA-NNNNNN` (et le même numéro en
 * `metadata`). Le webhook `payment.updated` ne transporte que l'identifiant de
 * commande Square, on relit donc la commande Square pour retrouver notre numéro.
 *
 * Clés saisies en administration et stockées chiffrées :
 *   - square_access_token           jeton d'accès de l'application
 *   - square_location_id            établissement qui encaisse
 *   - square_webhook_signature_key  clé de signature de l'abonnement webhook
 *   - square_environment            « production » (défaut) ou « sandbox »
 */

import { SquareClient, SquareEnvironment, WebhooksHelper, type Square } from "square";
import { getIntegrationSecret } from "@/server/integrations";
import { readSquareEvent, type SquareEventPayment } from "./squareEvents";
import { gatewayWebhookUrl } from "./webhookUrl";
import type {
  GatewayCheckoutSession,
  GatewayConnectionCheck,
  GatewayOrderContext,
  GatewayWebhookResult,
  PaymentGateway,
} from "./types";

const ACCESS_TOKEN = "square_access_token";
const LOCATION_ID = "square_location_id";
const WEBHOOK_SIGNATURE_KEY = "square_webhook_signature_key";
const ENVIRONMENT = "square_environment";

/**
 * URL exacte à déclarer comme point de notification chez Square.
 *
 * Square est le seul prestataire à faire entrer cette URL dans le calcul de la
 * signature : elle doit être identique, au caractère près, à celle saisie dans
 * le tableau de bord Square, sinon toutes les notifications sont rejetées.
 */
function squareWebhookUrl(): string {
  return gatewayWebhookUrl("square");
}

/** « sandbox » (essais) ou « production » (défaut, y compris si la clé est absente). */
async function environment(): Promise<string> {
  const value = (await getIntegrationSecret(ENVIRONMENT))?.trim().toLowerCase();
  return value === "sandbox" ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
}

async function client(): Promise<SquareClient | null> {
  const token = await getIntegrationSecret(ACCESS_TOKEN);
  if (!token) return null;
  return new SquareClient({ token, environment: await environment() });
}

/** Retrouve notre numéro de commande à partir du paiement Square. */
async function orderNumberOf(payment: SquareEventPayment): Promise<string | null> {
  // Chemin court : certains paiements portent déjà la référence.
  if (payment.reference_id) return payment.reference_id;
  if (!payment.order_id) return null;

  // Sinon on relit la commande Square, qui porte `referenceId` depuis la
  // création du lien de paiement.
  const square = await client();
  if (!square) return null;

  const response = await square.orders.get({ orderId: payment.order_id });
  const order = response.order;
  return order?.referenceId ?? order?.metadata?.orderNumber ?? null;
}

export const squareGateway: PaymentGateway = {
  meta: {
    id: "square",
    label: "Square",
    availability:
      "Disponible en France (EUR) — CB, Apple Pay, Google Pay via une page de paiement hébergée par Square.",
    implemented: true,
    keys: [
      {
        integrationKey: ACCESS_TOKEN,
        label: "Jeton d'accès",
        hint: "Console développeur Square → votre application → Credentials → Access token (production ou sandbox).",
      },
      {
        integrationKey: LOCATION_ID,
        label: "Identifiant d'établissement",
        hint: "Identifiant de l'établissement qui encaisse. Le bouton « Tester la connexion » ci-dessous liste ceux du compte.",
      },
      {
        integrationKey: WEBHOOK_SIGNATURE_KEY,
        label: "Clé de signature du webhook",
        hint: "Console développeur Square → Webhooks → votre abonnement → Signature key. L'abonnement doit écouter payment.updated.",
      },
      {
        integrationKey: ENVIRONMENT,
        label: "Environnement",
        hint: "« production » par défaut. Saisir « sandbox » uniquement pour des essais avec des clés de test.",
        optional: true,
      },
    ],
  },

  async isConfigured(): Promise<boolean> {
    const [token, location, signature] = await Promise.all([
      getIntegrationSecret(ACCESS_TOKEN),
      getIntegrationSecret(LOCATION_ID),
      getIntegrationSecret(WEBHOOK_SIGNATURE_KEY),
    ]);
    return Boolean(token && location && signature);
  },

  async createCheckoutSession(order: GatewayOrderContext): Promise<GatewayCheckoutSession> {
    const [square, locationId] = await Promise.all([client(), getIntegrationSecret(LOCATION_ID)]);
    if (!square) throw new Error("Square n'est pas configuré (jeton d'accès absent).");
    if (!locationId) throw new Error("Square n'est pas configuré (établissement absent).");

    const response = await square.checkout.paymentLinks.create({
      // Le numéro de commande est unique et ne change pas : rejouer la création
      // rend le lien déjà créé au lieu d'en ouvrir un second.
      idempotencyKey: order.orderNumber,
      description: order.description,
      order: {
        locationId,
        // C'est par cette référence que le webhook remonte jusqu'à la commande.
        referenceId: order.orderNumber,
        metadata: { orderNumber: order.orderNumber },
        // Une seule ligne au montant TTC déjà calculé côté serveur : Square ne
        // refait pas les totaux, il encaisse ce que la boutique facture.
        lineItems: [
          {
            name: order.description,
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(order.amountCents),
              currency: order.currency.toUpperCase() as Square.Currency,
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: order.successUrl,
        // L'adresse de livraison est déjà saisie dans le tunnel de la boutique.
        askForShippingAddress: false,
        allowTipping: false,
      },
      prePopulatedData: { buyerEmail: order.email },
      paymentNote: order.description,
    });

    const link = response.paymentLink;
    if (!link?.url) throw new Error("Square n'a pas renvoyé d'URL de paiement.");
    return { redirectUrl: link.url, reference: link.orderId ?? link.id ?? order.orderNumber };
  },

  async handleWebhook(request: Request): Promise<GatewayWebhookResult> {
    const signatureKey = await getIntegrationSecret(WEBHOOK_SIGNATURE_KEY);
    if (!signatureKey) throw new Error("Square n'est pas configuré (clé de signature absente).");

    const signature = request.headers.get("x-square-hmacsha256-signature");
    if (!signature) throw new Error("Signature Square absente.");

    // Corps brut obligatoire : la signature porte sur les octets exacts reçus,
    // précédés de l'URL de notification.
    const body = await request.text();
    const valid = await WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey,
      notificationUrl: squareWebhookUrl(),
    });
    if (!valid) throw new Error("Signature Square invalide.");

    // Seuls les événements de paiement décident du statut. Les remboursements
    // restent saisis à la main dans le back-office : un remboursement partiel ne
    // doit pas basculer toute la commande en « remboursée ».
    const event = readSquareEvent(body);
    if (!event) return { orderNumber: null, paymentStatus: null };

    return {
      orderNumber: await orderNumberOf(event.payment),
      paymentStatus: event.paymentStatus,
      reference: event.payment.id,
      amountCents: event.payment.amount_money?.amount,
      currency: event.payment.amount_money?.currency,
    };
  },

  async verifyConnection(): Promise<GatewayConnectionCheck> {
    const issues: string[] = [];
    const details: { label: string; value: string }[] = [];

    const [token, locationId, signatureKey] = await Promise.all([
      getIntegrationSecret(ACCESS_TOKEN),
      getIntegrationSecret(LOCATION_ID),
      getIntegrationSecret(WEBHOOK_SIGNATURE_KEY),
    ]);

    const baseUrl = await environment();
    const mode = baseUrl === SquareEnvironment.Sandbox ? "sandbox" : "production";
    details.push({ label: "Environnement", value: mode });
    details.push({ label: "URL de webhook à déclarer chez Square", value: squareWebhookUrl() });

    if (!token) {
      return {
        ok: false,
        summary: "Jeton d'accès Square absent.",
        issues: ["Enregistrez le jeton d'accès, puis relancez le test."],
        details,
      };
    }

    const square = new SquareClient({ token, environment: baseUrl });

    // Appel en lecture seule : valide le jeton et rend la liste des
    // établissements, dont l'identifiant à recopier.
    let locations: Square.Location[];
    try {
      const response = await square.locations.list();
      locations = response.locations ?? [];
    } catch (error) {
      return {
        ok: false,
        summary: "Square a refusé le jeton d'accès.",
        issues: [
          error instanceof Error ? error.message : "Appel à Square impossible.",
          `Vérifiez que le jeton correspond bien à l'environnement « ${mode} ».`,
        ],
        details,
      };
    }

    for (const location of locations) {
      details.push({
        label: location.name ?? "Établissement",
        value: `${location.id ?? "?"} — ${location.country ?? "?"} / ${location.currency ?? "?"}`,
      });
    }

    if (locations.length === 0) {
      issues.push("Aucun établissement sur ce compte Square.");
    }

    const active = locationId ? locations.find((entry) => entry.id === locationId) : undefined;
    if (!locationId) {
      issues.push("Identifiant d'établissement non renseigné — recopiez-en un dans la liste ci-dessous.");
    } else if (!active) {
      issues.push(
        `L'établissement « ${locationId} » n'appartient pas à ce compte Square (ou n'existe pas dans l'environnement « ${mode} »).`,
      );
    } else if (active.currency && active.currency !== "EUR") {
      issues.push(
        `Cet établissement encaisse en ${active.currency}, alors que la boutique facture en EUR. Square refusera le paiement.`,
      );
    }

    if (!signatureKey) {
      issues.push(
        "Clé de signature du webhook non renseignée : sans elle, les paiements ne passeront jamais en « payée » automatiquement.",
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      issues.push(
        "NEXT_PUBLIC_SITE_URL n'est pas défini : l'URL de webhook ci-dessous est incomplète et la vérification de signature échouera.",
      );
    }

    const label = active?.name ?? locations[0]?.name ?? "compte Square";
    return {
      ok: issues.length === 0,
      summary:
        issues.length === 0
          ? `Connecté à « ${label} » (${active?.country ?? "?"}, ${active?.currency ?? "?"}) en ${mode}.`
          : `Jeton valide (${locations.length} établissement${locations.length > 1 ? "s" : ""}), mais la configuration est incomplète.`,
      issues,
      details,
    };
  },
};
