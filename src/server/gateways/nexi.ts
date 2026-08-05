/**
 * Adaptateur Nexi — XPay, page de paiement hébergée (POST /orders/hpp).
 *
 * ⚠ Écrit d'après la documentation publique de XPay Global, sans avoir pu être
 * éprouvé contre un vrai compte Nexi. Deux points sont à revalider avec un
 * contrat de test avant de s'en servir chez un client :
 *   - la correspondance exacte entre `operationResult` et « payée » (voir
 *     `paymentStatusOf`) ;
 *   - l'URL de base de l'environnement de test, qui diffère selon le portail
 *     Nexi dont dépend le contrat (XPay Global, Intesa, Greece, CEE).
 * C'est pourquoi `meta.caution` affiche un avertissement en administration.
 *
 * Particularité de Nexi, à connaître avant de lire `handleWebhook` : la
 * notification n'est pas signée. Nexi rend un `securityToken` à l'ouverture du
 * paiement et le rejoue dans chaque notification ; l'authentification consiste
 * à comparer les deux. Ce jeton est donc conservé sur la commande
 * (voir @/server/gatewayTokens).
 *
 * Clés saisies en administration et stockées chiffrées :
 *   - nexi_api_key       clé d'API du contrat (en-tête X-Api-Key)
 *   - nexi_environment   « production » (défaut) ou « test »
 *   - nexi_base_url      URL de base, si le contrat ne dépend pas de XPay Global
 */

import { randomUUID } from "node:crypto";
import { getIntegrationSecret } from "@/server/integrations";
import { matchesOrderSecurityToken, setOrderSecurityToken } from "@/server/gatewayTokens";
import { nexiPaymentStatus, readNexiNotification } from "./nexiEvents";
import { gatewayWebhookUrl, isPubliclyReachable } from "./webhookUrl";
import type {
  GatewayCheckoutSession,
  GatewayConnectionCheck,
  GatewayOrderContext,
  GatewayWebhookResult,
  PaymentGateway,
} from "./types";

const API_KEY = "nexi_api_key";
const ENVIRONMENT = "nexi_environment";
const BASE_URL = "nexi_base_url";

const PRODUCTION_BASE = "https://xpay.nexigroup.com";
const TEST_BASE = "https://stg-ta.nexigroup.com";
const HPP_PATH = "/api/phoenix-0.0/psp/api/v1/orders/hpp";

/** Longueur maximale de `orderId` chez Nexi. Nos numéros font 15 caractères. */
const MAX_ORDER_ID = 27;

interface NexiConfig {
  apiKey: string;
  baseUrl: string;
  mode: "production" | "test";
}

async function config(): Promise<NexiConfig | null> {
  const [apiKey, environment, override] = await Promise.all([
    getIntegrationSecret(API_KEY),
    getIntegrationSecret(ENVIRONMENT),
    getIntegrationSecret(BASE_URL),
  ]);
  if (!apiKey) return null;

  const mode = environment?.trim().toLowerCase() === "test" ? "test" : "production";
  // L'URL saisie à la main prime : elle existe justement pour les contrats
  // rattachés à un autre portail Nexi que XPay Global.
  const baseUrl = (override?.trim() || (mode === "test" ? TEST_BASE : PRODUCTION_BASE)).replace(
    /\/$/,
    "",
  );
  return { apiKey, baseUrl, mode };
}

/** Code ISO 639-2 attendu par la page hébergée. */
function language(locale: "fr" | "en"): string {
  return locale === "en" ? "eng" : "fra";
}

interface NexiHppResponse {
  hostedPage?: string;
  securityToken?: string;
}

export const nexiGateway: PaymentGateway = {
  meta: {
    id: "nexi",
    label: "Nexi",
    availability:
      "Orienté Italie, Grèce et Europe centrale. Page de paiement hébergée XPay, notifications authentifiées par jeton.",
    implemented: true,
    caution:
      "Adaptateur écrit d'après la documentation publique XPay, jamais éprouvé contre un vrai compte Nexi. À valider par un paiement de test complet, notification comprise, avant toute mise en production.",
    keys: [
      {
        integrationKey: API_KEY,
        label: "Clé API",
        hint: "Clé du contrat Nexi, envoyée en en-tête X-Api-Key. Fournie avec le contrat XPay.",
      },
      {
        integrationKey: ENVIRONMENT,
        label: "Environnement",
        hint: "« production » par défaut. Saisir « test » pour l'environnement d'essai.",
        optional: true,
      },
      {
        integrationKey: BASE_URL,
        label: "URL de base (si autre portail)",
        hint: "À renseigner seulement si le contrat ne dépend pas de XPay Global — Intesa, Greece et CEE ont leur propre URL. Sinon laisser vide.",
        optional: true,
      },
    ],
  },

  async isConfigured(): Promise<boolean> {
    return Boolean(await getIntegrationSecret(API_KEY));
  },

  async createCheckoutSession(order: GatewayOrderContext): Promise<GatewayCheckoutSession> {
    const nexi = await config();
    if (!nexi) throw new Error("Nexi n'est pas configuré (clé API absente).");
    if (order.orderNumber.length > MAX_ORDER_ID) {
      throw new Error(`Nexi limite le numéro de commande à ${MAX_ORDER_ID} caractères.`);
    }

    // Nexi attend le montant dans la plus petite unité monétaire, sous forme de
    // chaîne : « 12345 » = 123,45 €.
    const amount = String(order.amountCents);

    const response = await fetch(`${nexi.baseUrl}${HPP_PATH}`, {
      method: "POST",
      headers: {
        "X-Api-Key": nexi.apiKey,
        "Correlation-Id": randomUUID(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order: {
          orderId: order.orderNumber,
          amount,
          currency: order.currency.toUpperCase(),
          description: order.description,
          customerInfo: { cardHolderEmail: order.email },
        },
        paymentSession: {
          actionType: "PAY",
          amount,
          language: language(order.locale),
          resultUrl: order.successUrl,
          cancelUrl: order.cancelUrl,
          notificationUrl: gatewayWebhookUrl("nexi"),
        },
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `Nexi a refusé l'ouverture du paiement (HTTP ${response.status}) : ${text.slice(0, 300)}`,
      );
    }

    const data = JSON.parse(text) as NexiHppResponse;
    if (!data.hostedPage) throw new Error("Nexi n'a pas renvoyé d'URL de paiement.");
    if (!data.securityToken) throw new Error("Nexi n'a pas renvoyé de jeton de sécurité.");

    // Sans ce jeton conservé, aucune notification ne pourra être authentifiée :
    // on l'écrit avant de rendre la main.
    await setOrderSecurityToken(order.orderNumber, data.securityToken);

    return { redirectUrl: data.hostedPage, reference: order.orderNumber };
  },

  async handleWebhook(request: Request): Promise<GatewayWebhookResult> {
    if (!(await getIntegrationSecret(API_KEY))) {
      throw new Error("Nexi n'est pas configuré (clé API absente).");
    }

    const read = readNexiNotification(await request.text());
    if (!read) throw new Error("Notification Nexi sans numéro de commande ou sans jeton.");

    // Tient lieu de vérification de signature : le jeton n'est connu que de Nexi
    // et de nous, et il est propre à cette commande.
    if (!(await matchesOrderSecurityToken(read.orderNumber, read.securityToken))) {
      throw new Error("Jeton de sécurité Nexi invalide.");
    }

    const operation = read.notification.operation;
    // Nexi compte déjà en centimes, mais sérialise en chaîne : un `Number()`
    // direct sur une valeur absente donnerait 0, soit un montant « payé » de
    // zéro euro accepté sans broncher. D'où le passage par undefined.
    const montant = operation?.operationAmount?.trim();
    return {
      orderNumber: read.orderNumber,
      paymentStatus: nexiPaymentStatus(operation?.operationResult, operation?.operationType),
      reference: operation?.operationId,
      amountCents: montant && /^\d+$/.test(montant) ? Number(montant) : undefined,
      currency: operation?.operationCurrency,
    };
  },

  async verifyConnection(): Promise<GatewayConnectionCheck> {
    const issues: string[] = [];
    const details: { label: string; value: string }[] = [];
    const webhookUrl = gatewayWebhookUrl("nexi");

    const nexi = await config();
    if (!nexi) {
      return {
        ok: false,
        summary: "Clé API Nexi absente.",
        issues: ["Enregistrez la clé API du contrat, puis relancez le test."],
        details: [{ label: "URL de notification", value: webhookUrl }],
      };
    }

    details.push({ label: "Environnement", value: nexi.mode });
    details.push({ label: "URL de base", value: nexi.baseUrl });
    details.push({ label: "URL de notification (transmise à chaque paiement)", value: webhookUrl });

    // Nexi n'expose pas d'appel de simple lecture permettant de valider une clé.
    // On ouvre donc une page de paiement d'un centime sur un numéro fictif :
    // elle n'est présentée à personne et expire d'elle-même, mais elle dit si la
    // clé, l'environnement et l'URL de base sont les bons.
    const probeOrderId = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      const response = await fetch(`${nexi.baseUrl}${HPP_PATH}`, {
        method: "POST",
        headers: {
          "X-Api-Key": nexi.apiKey,
          "Correlation-Id": randomUUID(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: { orderId: probeOrderId, amount: "1", currency: "EUR" },
          paymentSession: {
            actionType: "PAY",
            amount: "1",
            language: "fra",
            resultUrl: webhookUrl,
            cancelUrl: webhookUrl,
            notificationUrl: webhookUrl,
          },
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          summary: `Nexi a refusé l'appel (HTTP ${response.status}).`,
          issues: [
            text.slice(0, 300),
            "Vérifiez la clé API, l'environnement, et l'URL de base si le contrat ne dépend pas de XPay Global.",
          ],
          details,
        };
      }

      const data = JSON.parse(text) as NexiHppResponse;
      if (!data.hostedPage || !data.securityToken) {
        issues.push(
          "Nexi a répondu, mais sans page hébergée ni jeton de sécurité : le format ne correspond pas à celui attendu. L'adaptateur est à revoir pour ce contrat.",
        );
      } else {
        details.push({
          label: "Page de paiement obtenue",
          value: "oui (essai à 0,01 €, jamais présenté)",
        });
      }
    } catch (error) {
      return {
        ok: false,
        summary: "Impossible de joindre Nexi.",
        issues: [
          error instanceof Error ? error.message : "Appel impossible.",
          `URL essayée : ${nexi.baseUrl}${HPP_PATH}`,
        ],
        details,
      };
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      issues.push("NEXT_PUBLIC_SITE_URL n'est pas défini : l'URL de notification est incomplète.");
    } else if (!isPubliclyReachable(webhookUrl)) {
      issues.push(
        `L'URL de notification (${webhookUrl}) n'est pas joignable depuis l'extérieur : aucune commande ne passerait en « payée ».`,
      );
    }

    issues.push(
      "Cet adaptateur n'a jamais été éprouvé contre un vrai compte Nexi : passez un paiement de test complet, notification comprise, avant de l'activer en production.",
    );

    // Jamais « ok » : la clé peut répondre sans que l'intégration soit validée,
    // et cet écran ne doit pas donner un feu vert qu'on n'a pas.
    return {
      ok: false,
      summary: `Clé acceptée par Nexi en ${nexi.mode}, mais l'intégration reste à valider par un paiement de test.`,
      issues,
      details,
    };
  },
};
