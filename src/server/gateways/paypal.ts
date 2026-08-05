/**
 * Adaptateur PayPal — Orders v2, approbation sur une page hébergée par PayPal.
 *
 * Écrit directement sur l'API REST plutôt que sur `@paypal/paypal-server-sdk` :
 * le SDK ne couvre pas la vérification de signature des webhooks, qui est le
 * point le plus sensible de l'intégration. Une seule voie d'authentification
 * (OAuth2 client_credentials) sert à tous les appels.
 *
 * Déroulé, entièrement piloté par les webhooks — la redirection de retour du
 * client ne prouve rien :
 *   1. `createCheckoutSession` crée une commande PayPal (intent CAPTURE) et rend
 *      le lien d'approbation ;
 *   2. le client approuve, PayPal notifie `CHECKOUT.ORDER.APPROVED` ;
 *   3. on capture alors les fonds côté serveur — sans cette étape, l'argent
 *      approuvé n'est jamais encaissé ;
 *   4. PayPal notifie `PAYMENT.CAPTURE.COMPLETED`, la commande passe en « payée ».
 *
 * Clés saisies en administration et stockées chiffrées :
 *   - paypal_client_id     identifiant de l'application
 *   - paypal_secret        secret de l'application
 *   - paypal_webhook_id    identifiant du webhook (indispensable à la signature)
 *   - paypal_environment   « production » (défaut) ou « sandbox »
 */

import { getIntegrationSecret } from "@/server/integrations";
import {
  paypalApprovalLink,
  paypalOrderNumber,
  type PayPalOrderResponse,
  type PayPalWebhookEvent,
} from "./paypalEvents";
import { decimalToCents } from "./amount";
import { gatewayWebhookUrl } from "./webhookUrl";
import type {
  GatewayCheckoutSession,
  GatewayConnectionCheck,
  GatewayOrderContext,
  GatewayWebhookResult,
  PaymentGateway,
} from "./types";

const CLIENT_ID = "paypal_client_id";
const SECRET = "paypal_secret";
const WEBHOOK_ID = "paypal_webhook_id";
const ENVIRONMENT = "paypal_environment";

const PRODUCTION_BASE = "https://api-m.paypal.com";
const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

/** Événements sans lesquels une commande ne passerait jamais en « payée ». */
const REQUIRED_EVENTS = ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"];

interface PayPalCredentials {
  clientId: string;
  secret: string;
  baseUrl: string;
}

async function credentials(): Promise<PayPalCredentials | null> {
  const [clientId, secret, environment] = await Promise.all([
    getIntegrationSecret(CLIENT_ID),
    getIntegrationSecret(SECRET),
    getIntegrationSecret(ENVIRONMENT),
  ]);
  if (!clientId || !secret) return null;
  const sandbox = environment?.trim().toLowerCase() === "sandbox";
  return { clientId, secret, baseUrl: sandbox ? SANDBOX_BASE : PRODUCTION_BASE };
}

/** Jeton d'accès OAuth2. Court-vécu : on en redemande un à chaque appel. */
async function accessToken({ clientId, secret, baseUrl }: PayPalCredentials): Promise<string> {
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal a refusé les identifiants (HTTP ${response.status}).`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal n'a pas renvoyé de jeton d'accès.");
  return data.access_token;
}

/** Appel authentifié à l'API PayPal, avec message d'erreur lisible. */
async function call<T>(
  creds: PayPalCredentials,
  token: string,
  path: string,
  init: { method: string; body?: unknown; requestId?: string },
): Promise<T> {
  const response = await fetch(`${creds.baseUrl}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PayPal ${init.method} ${path} → HTTP ${response.status} : ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** Montant PayPal : chaîne décimale, pas des centimes. */
function amountValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const paypalGateway: PaymentGateway = {
  meta: {
    id: "paypal",
    label: "PayPal",
    availability:
      "Très demandé en France, en complément de la carte bancaire. Le client paie sur une page PayPal, avec ou sans compte PayPal.",
    implemented: true,
    keys: [
      {
        integrationKey: CLIENT_ID,
        label: "Identifiant client",
        hint: "developer.paypal.com → Apps & Credentials → votre application → Client ID.",
      },
      {
        integrationKey: SECRET,
        label: "Secret",
        hint: "Même écran, Secret de l'application. Distinct entre Live et Sandbox.",
      },
      {
        integrationKey: WEBHOOK_ID,
        label: "Identifiant du webhook",
        hint: "Même application → Webhooks → l'abonnement créé sur /api/payments/webhook/paypal → Webhook ID. Sans lui, aucune notification ne peut être validée.",
      },
      {
        integrationKey: ENVIRONMENT,
        label: "Environnement",
        hint: "« production » par défaut. Saisir « sandbox » uniquement pour des essais.",
        optional: true,
      },
    ],
  },

  async isConfigured(): Promise<boolean> {
    const [clientId, secret, webhookId] = await Promise.all([
      getIntegrationSecret(CLIENT_ID),
      getIntegrationSecret(SECRET),
      getIntegrationSecret(WEBHOOK_ID),
    ]);
    return Boolean(clientId && secret && webhookId);
  },

  async createCheckoutSession(order: GatewayOrderContext): Promise<GatewayCheckoutSession> {
    const creds = await credentials();
    if (!creds) throw new Error("PayPal n'est pas configuré (identifiants absents).");

    const token = await accessToken(creds);
    const created = await call<PayPalOrderResponse>(creds, token, "/v2/checkout/orders", {
      method: "POST",
      // Le numéro de commande sert d'identifiant idempotent : rejouer la
      // création rend la commande PayPal déjà ouverte.
      requestId: order.orderNumber,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            // Les deux champs remontent dans les webhooks : c'est par eux qu'on
            // retrouve la commande de la boutique.
            custom_id: order.orderNumber,
            invoice_id: order.orderNumber,
            description: order.description,
            amount: {
              currency_code: order.currency.toUpperCase(),
              value: amountValue(order.amountCents),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "MLC Bois",
              locale: order.locale === "en" ? "en-GB" : "fr-FR",
              // L'adresse de livraison est déjà saisie dans le tunnel.
              shipping_preference: "NO_SHIPPING",
              // Affiche « Payer maintenant » plutôt que « Continuer ».
              user_action: "PAY_NOW",
              return_url: order.successUrl,
              cancel_url: order.cancelUrl,
            },
          },
        },
      },
    });

    const redirectUrl = paypalApprovalLink(created);
    if (!redirectUrl) throw new Error("PayPal n'a pas renvoyé de lien d'approbation.");
    if (!created.id) throw new Error("PayPal n'a pas renvoyé d'identifiant de commande.");
    return { redirectUrl, reference: created.id };
  },

  async handleWebhook(request: Request): Promise<GatewayWebhookResult> {
    const [creds, webhookId] = await Promise.all([credentials(), getIntegrationSecret(WEBHOOK_ID)]);
    if (!creds) throw new Error("PayPal n'est pas configuré (identifiants absents).");
    if (!webhookId) throw new Error("PayPal n'est pas configuré (identifiant de webhook absent).");

    const body = await request.text();
    const headers = request.headers;
    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const transmissionSig = headers.get("paypal-transmission-sig");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      throw new Error("Notification PayPal sans en-têtes de signature.");
    }

    const event = JSON.parse(body) as PayPalWebhookEvent;
    const token = await accessToken(creds);

    // C'est PayPal lui-même qui valide la signature : on lui renvoie les
    // en-têtes et l'événement, il répond SUCCESS ou FAILURE.
    const verification = await call<{ verification_status?: string }>(
      creds,
      token,
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          transmission_sig: transmissionSig,
          cert_url: certUrl,
          auth_algo: authAlgo,
          webhook_id: webhookId,
          webhook_event: event,
        },
      },
    );

    if (verification.verification_status !== "SUCCESS") {
      throw new Error("Signature PayPal invalide.");
    }

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        // Le client a approuvé, mais rien n'est encaissé tant qu'on n'a pas
        // capturé. Sans cette étape, l'argent reste chez le client.
        const paypalOrderId = event.resource?.id;
        if (paypalOrderId) {
          await call(creds, token, `/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: "POST",
            // Rejouer la notification ne capture pas deux fois.
            requestId: `capture-${paypalOrderId}`,
            body: {},
          });
        }
        // La capture déclenche PAYMENT.CAPTURE.COMPLETED : c'est cet
        // événement-là, et pas celui-ci, qui fait foi.
        return { orderNumber: null, paymentStatus: null };
      }

      case "PAYMENT.CAPTURE.COMPLETED":
        return {
          orderNumber: paypalOrderNumber(event),
          paymentStatus: "bezahlt",
          reference: event.resource?.id,
          amountCents: decimalToCents(event.resource?.amount?.value) ?? undefined,
          currency: event.resource?.amount?.currency_code,
        };

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REVERSED":
        return {
          orderNumber: paypalOrderNumber(event),
          paymentStatus: "fehlgeschlagen",
          reference: event.resource?.id,
        };

      default:
        return { orderNumber: null, paymentStatus: null };
    }
  },

  async verifyConnection(): Promise<GatewayConnectionCheck> {
    const issues: string[] = [];
    const details: { label: string; value: string }[] = [];
    const webhookUrl = gatewayWebhookUrl("paypal");
    details.push({ label: "URL de webhook à déclarer chez PayPal", value: webhookUrl });

    const creds = await credentials();
    if (!creds) {
      return {
        ok: false,
        summary: "Identifiants PayPal absents.",
        issues: ["Enregistrez l'identifiant client et le secret, puis relancez le test."],
        details,
      };
    }

    const mode = creds.baseUrl === SANDBOX_BASE ? "sandbox" : "production";
    details.push({ label: "Environnement", value: mode });

    let token: string;
    try {
      token = await accessToken(creds);
    } catch (error) {
      return {
        ok: false,
        summary: "PayPal a refusé les identifiants.",
        issues: [
          error instanceof Error ? error.message : "Appel à PayPal impossible.",
          `Vérifiez que les identifiants correspondent bien à l'environnement « ${mode} ».`,
        ],
        details,
      };
    }

    const webhookId = await getIntegrationSecret(WEBHOOK_ID);
    if (!webhookId) {
      issues.push(
        "Identifiant du webhook non renseigné : sans lui, aucune notification ne peut être validée et aucune commande ne passera en « payée ».",
      );
    }

    // Vérifie que l'abonnement existe bien, qu'il pointe sur la bonne URL et
    // qu'il suit les événements nécessaires.
    try {
      const declared = await call<{
        webhooks?: { id?: string; url?: string; event_types?: { name?: string }[] }[];
      }>(creds, token, "/v1/notifications/webhooks", { method: "GET" });

      const webhooks = declared.webhooks ?? [];
      const match = webhooks.find((hook) => hook.url === webhookUrl);

      if (!match) {
        issues.push(
          `Aucun webhook déclaré vers ${webhookUrl}. PayPal → votre application → Webhooks → Add webhook, avec ${REQUIRED_EVENTS.join(" et ")}.`,
        );
        if (webhooks.length > 0) {
          details.push({
            label: "Webhooks déclarés (URL différentes)",
            value: webhooks.map((hook) => hook.url ?? "?").join(", "),
          });
        }
      } else {
        details.push({ label: "Identifiant du webhook déclaré", value: match.id ?? "?" });
        const names = (match.event_types ?? []).map((entry) => entry.name);
        const covered =
          names.includes("*") || REQUIRED_EVENTS.every((event) => names.includes(event));
        if (!covered) {
          issues.push(
            `Le webhook déclaré ne suit pas ${REQUIRED_EVENTS.join(" et ")} : les paiements n'aboutiraient pas.`,
          );
        }
        if (webhookId && match.id && webhookId !== match.id) {
          issues.push(
            `L'identifiant de webhook enregistré (${webhookId}) ne correspond pas à celui déclaré chez PayPal (${match.id}).`,
          );
        }
      }
    } catch (error) {
      details.push({
        label: "Webhooks",
        value: error instanceof Error ? error.message : "non vérifiables",
      });
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      issues.push(
        "NEXT_PUBLIC_SITE_URL n'est pas défini : l'URL de webhook ci-dessus est incomplète.",
      );
    }

    return {
      ok: issues.length === 0,
      summary:
        issues.length === 0
          ? `Connecté à PayPal en ${mode}, webhook déclaré et complet.`
          : `Identifiants valides en ${mode}, mais la configuration est incomplète.`,
      issues,
      details,
    };
  },
};
