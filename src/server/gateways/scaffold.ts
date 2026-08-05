/**
 * Fabrique d'adaptateurs « pré-câblés » : Mollie et Nexi.
 *
 * Chacun expose le même contrat que Stripe et Square et sait déjà lire ses clés,
 * mais l'encaissement lui-même reste à écrire — volontairement. Livrer des
 * intégrations non testables serait fragile ; on livre plutôt l'emplacement, le
 * stockage des clés et l'inscription au registre, pour que le jour où un compte
 * Mollie/Nexi existe, il ne reste que la logique propre au prestataire à
 * compléter dans createCheckoutSession / handleWebhook.
 */

import { getIntegrationSecret } from "@/server/integrations";
import type {
  GatewayCheckoutSession,
  GatewayMeta,
  GatewayWebhookResult,
  PaymentGateway,
} from "./types";

class NotImplementedGatewayError extends Error {
  constructor(label: string) {
    super(
      `L'encaissement ${label} n'est pas encore branché. Choisissez Stripe comme prestataire actif, ou finalisez l'adaptateur ${label}.`,
    );
    this.name = "NotImplementedGatewayError";
  }
}

export function scaffoldGateway(meta: GatewayMeta): PaymentGateway {
  return {
    meta,

    async isConfigured(): Promise<boolean> {
      const values = await Promise.all(
        meta.keys
          .filter((field) => !field.optional)
          .map((field) => getIntegrationSecret(field.integrationKey)),
      );
      return values.every(Boolean);
    },

    async createCheckoutSession(): Promise<GatewayCheckoutSession> {
      throw new NotImplementedGatewayError(meta.label);
    },

    async handleWebhook(): Promise<GatewayWebhookResult> {
      throw new NotImplementedGatewayError(meta.label);
    },
  };
}
