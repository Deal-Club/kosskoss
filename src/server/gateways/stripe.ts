/**
 * Adaptateur Stripe — le seul réellement implémenté aujourd'hui.
 *
 * Encaissement par Stripe Checkout (page de paiement hébergée par Stripe) :
 * aucune donnée de carte ne transite par ce serveur, donc pas de contrainte PCI
 * lourde. La vérité du paiement vient du webhook signé, jamais de la redirection
 * de retour — un client peut fermer l'onglet avant que Stripe ne nous rappelle.
 *
 * Deux secrets, saisis en administration et stockés chiffrés :
 *   - stripe_secret_key      (sk_live_… / sk_test_…)
 *   - stripe_webhook_secret  (whsec_…), pour valider la signature des webhooks.
 */

import Stripe from "stripe";
import { getIntegrationSecret } from "@/server/integrations";
import { gatewayWebhookUrl } from "./webhookUrl";
import type {
  GatewayCheckoutSession,
  GatewayConnectionCheck,
  GatewayOrderContext,
  GatewayWebhookResult,
  PaymentGateway,
} from "./types";

const SECRET_KEY = "stripe_secret_key";
const WEBHOOK_SECRET = "stripe_webhook_secret";

/** Événements sans lesquels une commande ne passerait jamais en « payée ». */
const REQUIRED_EVENTS = ["checkout.session.completed"];

async function client(): Promise<Stripe | null> {
  const key = await getIntegrationSecret(SECRET_KEY);
  if (!key) return null;
  return new Stripe(key);
}

/** Extrait le numéro de commande d'une session Checkout, où qu'il soit rangé. */
function orderNumberOf(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id ?? session.metadata?.orderNumber ?? null;
}

function paymentIntentOf(session: Stripe.Checkout.Session): string | undefined {
  return typeof session.payment_intent === "string" ? session.payment_intent : undefined;
}

export const stripeGateway: PaymentGateway = {
  meta: {
    id: "stripe",
    label: "Stripe",
    availability: "Recommandé — CB, Apple Pay, Google Pay. Excellent support France.",
    implemented: true,
    keys: [
      {
        integrationKey: SECRET_KEY,
        label: "Clé secrète",
        hint: "sk_live_… (ou sk_test_… pour les essais). Tableau de bord Stripe → Développeurs → Clés API.",
      },
      {
        integrationKey: WEBHOOK_SECRET,
        label: "Secret du webhook",
        hint: "whsec_… Créé en ajoutant l'endpoint /api/payments/webhook/stripe dans Stripe → Développeurs → Webhooks.",
      },
    ],
  },

  async isConfigured(): Promise<boolean> {
    const [secret, webhook] = await Promise.all([
      getIntegrationSecret(SECRET_KEY),
      getIntegrationSecret(WEBHOOK_SECRET),
    ]);
    return Boolean(secret && webhook);
  },

  async createCheckoutSession(order: GatewayOrderContext): Promise<GatewayCheckoutSession> {
    const stripe = await client();
    if (!stripe) throw new Error("Stripe n'est pas configuré (clé secrète absente).");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: order.locale === "en" ? "en" : "fr",
      customer_email: order.email,
      // Rattache la session à la commande des deux façons : le webhook lira l'une
      // ou l'autre selon le type d'événement.
      client_reference_id: order.orderNumber,
      metadata: { orderNumber: order.orderNumber },
      payment_intent_data: { metadata: { orderNumber: order.orderNumber } },
      // Une seule ligne au montant TTC déjà calculé côté serveur : Stripe ne
      // refait pas les totaux, il encaisse le montant que la boutique facture.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: order.amountCents,
            product_data: { name: order.description },
          },
        },
      ],
      success_url: order.successUrl,
      cancel_url: order.cancelUrl,
    });

    if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
    return { redirectUrl: session.url, reference: session.id };
  },

  async handleWebhook(request: Request): Promise<GatewayWebhookResult> {
    const [stripe, webhookSecret] = await Promise.all([
      client(),
      getIntegrationSecret(WEBHOOK_SECRET),
    ]);
    if (!stripe || !webhookSecret) throw new Error("Stripe n'est pas configuré.");

    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new Error("Signature Stripe absente.");

    // Corps brut obligatoire : la signature porte sur les octets exacts reçus.
    const payload = await request.text();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          orderNumber: orderNumberOf(session),
          paymentStatus: session.payment_status === "paid" ? "bezahlt" : null,
          reference: paymentIntentOf(session),
          // `amount_total` est le montant effectivement réglé, en centimes,
          // remises et taxes comprises : c'est bien lui qu'il faut comparer au
          // total de la commande, et non `amount_subtotal`.
          amountCents: session.amount_total ?? undefined,
          currency: session.currency ?? undefined,
        };
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return { orderNumber: orderNumberOf(session), paymentStatus: "fehlgeschlagen" };
      }
      default:
        // Événement non pertinent pour l'état de paiement : accusé de réception
        // sans effet (voir la route webhook).
        return { orderNumber: null, paymentStatus: null };
    }
  },

  async verifyConnection(): Promise<GatewayConnectionCheck> {
    const issues: string[] = [];
    const details: { label: string; value: string }[] = [];
    const webhookUrl = gatewayWebhookUrl("stripe");
    details.push({ label: "URL de webhook à déclarer chez Stripe", value: webhookUrl });

    const key = await getIntegrationSecret(SECRET_KEY);
    if (!key) {
      return {
        ok: false,
        summary: "Clé secrète Stripe absente.",
        issues: ["Enregistrez la clé secrète (sk_live_… ou sk_test_…), puis relancez le test."],
        details,
      };
    }

    const mode = key.startsWith("sk_live_")
      ? "production"
      : key.startsWith("sk_test_")
        ? "test"
        : "inconnu";
    details.push({ label: "Mode de la clé", value: mode });

    const stripe = new Stripe(key);

    // Appel en lecture seule : valide la clé et décrit le compte qui encaisse.
    let account: Stripe.Account;
    try {
      // `null` = le compte auquel appartient la clé.
      account = await stripe.accounts.retrieve(null);
    } catch (error) {
      return {
        ok: false,
        summary: "Stripe a refusé la clé secrète.",
        issues: [error instanceof Error ? error.message : "Appel à Stripe impossible."],
        details,
      };
    }

    const name =
      account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? account.id;
    details.push({ label: "Compte", value: `${name} (${account.id})` });
    details.push({
      label: "Pays / devise",
      value: `${account.country ?? "?"} / ${account.default_currency?.toUpperCase() ?? "?"}`,
    });

    if (!account.charges_enabled) {
      issues.push(
        "Ce compte Stripe n'est pas encore autorisé à encaisser : terminez la vérification du compte dans le tableau de bord Stripe.",
      );
    }
    if (account.default_currency && account.default_currency.toUpperCase() !== "EUR") {
      issues.push(
        `Le compte encaisse par défaut en ${account.default_currency.toUpperCase()}, alors que la boutique facture en EUR. Vérifiez que l'euro est bien accepté.`,
      );
    }

    if (!(await getIntegrationSecret(WEBHOOK_SECRET))) {
      issues.push(
        "Secret du webhook (whsec_…) non renseigné : sans lui, aucune commande ne passera automatiquement en « payée ».",
      );
    }

    // Vérifie que l'endpoint est bien déclaré côté Stripe et qu'il suit les bons
    // événements. Une clé restreinte peut refuser cette lecture : ce n'est alors
    // pas bloquant, on le signale simplement.
    try {
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const declared = endpoints.data.find((endpoint) => endpoint.url === webhookUrl);
      if (!declared) {
        issues.push(
          `Aucun webhook déclaré vers ${webhookUrl}. Stripe → Développeurs → Webhooks → Ajouter un endpoint, avec l'événement checkout.session.completed.`,
        );
      } else {
        details.push({
          label: "Webhook déclaré",
          value: `${declared.status} — ${declared.enabled_events.join(", ")}`,
        });
        const covered =
          declared.enabled_events.includes("*") ||
          REQUIRED_EVENTS.every((event) => declared.enabled_events.includes(event));
        if (!covered) {
          issues.push(
            `Le webhook déclaré ne suit pas ${REQUIRED_EVENTS.join(", ")} : les paiements réussis ne remonteraient pas.`,
          );
        }
        if (declared.status !== "enabled") {
          issues.push("Le webhook déclaré chez Stripe est désactivé.");
        }
      }
    } catch {
      details.push({
        label: "Webhooks",
        value: "non vérifiables avec cette clé (clé restreinte) — à contrôler manuellement",
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
          ? `Connecté à « ${name} » (${account.country ?? "?"}, ${account.default_currency?.toUpperCase() ?? "?"}) en mode ${mode}.`
          : `Clé valide pour « ${name} », mais la configuration est incomplète.`,
      issues,
      details,
    };
  },
};
