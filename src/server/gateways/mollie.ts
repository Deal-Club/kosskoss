/**
 * Adaptateur Mollie — encaissement par page de paiement hébergée.
 *
 * Même principe que Stripe et Square : le client paie chez Mollie, aucune donnée
 * de carte ne transite par ce serveur.
 *
 * Particularité de Mollie, à connaître avant de lire `handleWebhook` : la
 * notification **n'est pas signée** et ne contient qu'un identifiant de paiement.
 * C'est le modèle documenté par Mollie — la sécurité vient de ce qu'on relit le
 * paiement depuis l'API avec notre propre clé plutôt que de croire le corps du
 * message. Un faux webhook ne peut donc rien affirmer : au pire il nous fait
 * relire un paiement qui nous appartient déjà.
 *
 * Autre particularité : l'URL de notification est transmise à chaque paiement
 * (`webhookUrl`), il n'y a donc rien à déclarer dans le tableau de bord Mollie.
 * En revanche Mollie refuse une URL non publique — un `localhost` fait échouer
 * la création du paiement.
 *
 * Une seule clé, saisie en administration et stockée chiffrée :
 *   - mollie_api_key   live_… (ou test_… pour les essais)
 */

import createMollieClient, {
  Locale,
  PaymentStatus as MolliePaymentStatus,
  type MollieClient,
} from "@mollie/api-client";
import { getIntegrationSecret } from "@/server/integrations";
import { gatewayWebhookUrl, isPubliclyReachable } from "./webhookUrl";
import { decimalToCents } from "./amount";
import type {
  GatewayCheckoutSession,
  GatewayConnectionCheck,
  GatewayOrderContext,
  GatewayWebhookResult,
  PaymentGateway,
} from "./types";

const API_KEY = "mollie_api_key";

async function client(): Promise<MollieClient | null> {
  const apiKey = await getIntegrationSecret(API_KEY);
  if (!apiKey) return null;
  return createMollieClient({ apiKey });
}

/**
 * Montant au format Mollie : une chaîne décimale, pas des centimes.
 * Envoyer les centimes tels quels facturerait cent fois le prix.
 */
function amountValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Traduit un statut Mollie en statut de commande.
 * `authorized` (fonds réservés, pas encore capturés) et `pending` laissent la
 * commande en attente : seule une capture aboutie vaut paiement.
 */
function paymentStatusOf(status: MolliePaymentStatus): GatewayWebhookResult["paymentStatus"] {
  switch (status) {
    case MolliePaymentStatus.paid:
      return "bezahlt";
    case MolliePaymentStatus.failed:
    case MolliePaymentStatus.canceled:
    case MolliePaymentStatus.expired:
      return "fehlgeschlagen";
    default:
      return null;
  }
}

/** Numéro de commande rangé dans les métadonnées à la création du paiement. */
function orderNumberOf(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).orderNumber;
  return typeof value === "string" && value ? value : null;
}

/**
 * Identifiant de paiement contenu dans la notification.
 *
 * Mollie poste `id=tr_…` en formulaire ; on accepte aussi un corps JSON, par
 * prudence si le format évoluait.
 */
function paymentIdOf(body: string): string | null {
  const fromForm = new URLSearchParams(body).get("id");
  if (fromForm?.startsWith("tr_")) return fromForm;

  try {
    const parsed = JSON.parse(body) as { id?: unknown };
    if (typeof parsed.id === "string" && parsed.id.startsWith("tr_")) return parsed.id;
  } catch {
    // Corps non JSON : rien de plus à tenter.
  }
  return null;
}

export const mollieGateway: PaymentGateway = {
  meta: {
    id: "mollie",
    label: "Mollie",
    availability:
      "Bien adapté à la France — CB, Bancontact, iDEAL, virement SEPA. Une seule clé à saisir, rien à déclarer côté Mollie.",
    implemented: true,
    keys: [
      {
        integrationKey: API_KEY,
        label: "Clé API",
        hint: "live_… (ou test_… pour les essais). Tableau de bord Mollie → Développeurs → Clés API.",
      },
    ],
  },

  async isConfigured(): Promise<boolean> {
    return Boolean(await getIntegrationSecret(API_KEY));
  },

  async createCheckoutSession(order: GatewayOrderContext): Promise<GatewayCheckoutSession> {
    const mollie = await client();
    if (!mollie) throw new Error("Mollie n'est pas configuré (clé API absente).");

    const payment = await mollie.payments.create({
      amount: { currency: order.currency.toUpperCase(), value: amountValue(order.amountCents) },
      description: order.description,
      redirectUrl: order.successUrl,
      cancelUrl: order.cancelUrl,
      // Transmise à chaque paiement : c'est ici, et pas dans un tableau de bord,
      // que Mollie apprend où notifier.
      webhookUrl: gatewayWebhookUrl("mollie"),
      locale: order.locale === "en" ? Locale.en_GB : Locale.fr_FR,
      // Seul lien entre le paiement Mollie et la commande de la boutique.
      metadata: { orderNumber: order.orderNumber },
    });

    const redirectUrl = payment.getCheckoutUrl();
    if (!redirectUrl) throw new Error("Mollie n'a pas renvoyé d'URL de paiement.");
    return { redirectUrl, reference: payment.id };
  },

  async handleWebhook(request: Request): Promise<GatewayWebhookResult> {
    const mollie = await client();
    if (!mollie) throw new Error("Mollie n'est pas configuré (clé API absente).");

    const paymentId = paymentIdOf(await request.text());
    if (!paymentId) throw new Error("Notification Mollie sans identifiant de paiement.");

    // La vérité vient de l'API, jamais du corps de la notification.
    const payment = await mollie.payments.get(paymentId);

    return {
      orderNumber: orderNumberOf(payment.metadata),
      paymentStatus: paymentStatusOf(payment.status),
      reference: payment.id,
      // Mollie annonce le montant en unité principale (« 214.50 »), comme il
      // l'attend à la création du paiement.
      amountCents: decimalToCents(payment.amount?.value) ?? undefined,
      currency: payment.amount?.currency,
    };
  },

  async verifyConnection(): Promise<GatewayConnectionCheck> {
    const issues: string[] = [];
    const details: { label: string; value: string }[] = [];
    const webhookUrl = gatewayWebhookUrl("mollie");
    details.push({ label: "URL de notification (transmise à chaque paiement)", value: webhookUrl });

    const apiKey = await getIntegrationSecret(API_KEY);
    if (!apiKey) {
      return {
        ok: false,
        summary: "Clé API Mollie absente.",
        issues: ["Enregistrez la clé API (live_… ou test_…), puis relancez le test."],
        details,
      };
    }

    const mode = apiKey.startsWith("live_")
      ? "production"
      : apiKey.startsWith("test_")
        ? "test"
        : "inconnu";
    details.push({ label: "Mode de la clé", value: mode });

    const mollie = createMollieClient({ apiKey });

    // Appel en lecture seule : valide la clé et décrit le profil qui encaisse.
    let profileName: string;
    try {
      const profile = await mollie.profiles.getCurrent();
      profileName = profile.name;
      details.push({ label: "Profil", value: `${profile.name} — ${profile.website}` });
      details.push({ label: "Statut du profil", value: `${profile.status} (${profile.mode})` });
      if (profile.status !== "verified") {
        issues.push(
          `Le profil Mollie est « ${profile.status} » : tant qu'il n'est pas vérifié, il ne peut pas encaisser de vrais paiements.`,
        );
      }
    } catch (error) {
      return {
        ok: false,
        summary: "Mollie a refusé la clé API.",
        issues: [error instanceof Error ? error.message : "Appel à Mollie impossible."],
        details,
      };
    }

    // Moyens de paiement réellement activés sur le compte : c'est là qu'on voit
    // si la carte bancaire est bien ouverte, ou encore en cours d'activation.
    try {
      const methods = await mollie.methods.list();
      details.push({
        label: "Moyens actifs chez Mollie",
        value: methods.length > 0 ? methods.map((method) => method.description).join(", ") : "aucun",
      });
      if (methods.length === 0) {
        issues.push(
          "Aucun moyen de paiement activé chez Mollie : activez-les dans le tableau de bord Mollie.",
        );
      }
    } catch {
      details.push({ label: "Moyens actifs chez Mollie", value: "non lisibles avec cette clé" });
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      issues.push("NEXT_PUBLIC_SITE_URL n'est pas défini : l'URL de notification est incomplète.");
    } else if (!isPubliclyReachable(webhookUrl)) {
      issues.push(
        `Mollie refuse une URL de notification non publique (${webhookUrl}) : la création du paiement échouerait. En local, passez par un tunnel type ngrok.`,
      );
    }

    return {
      ok: issues.length === 0,
      summary:
        issues.length === 0
          ? `Connecté au profil « ${profileName} » en mode ${mode}.`
          : `Clé valide pour « ${profileName} », mais la configuration est incomplète.`,
      issues,
      details,
    };
  },
};
