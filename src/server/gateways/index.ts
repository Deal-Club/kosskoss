/**
 * Registre des prestataires de paiement et configuration du prestataire actif.
 *
 * Un seul prestataire est actif à la fois — c'est le choix retenu pour la
 * boutique. La configuration (quel prestataire, quels moyens de paiement il
 * encaisse) tient dans une ligne de la table générique `Setting`, comme les
 * coordonnées de virement : pas de modèle dédié pour trois champs.
 *
 * Les clés API, elles, vivent dans la table `Integration` (chiffrées) et ne
 * transitent jamais par cette configuration.
 */

import { cache } from "react";
import { prisma } from "@/server/prisma";
import { stripeGateway } from "./stripe";
import { mollieGateway } from "./mollie";
import { squareGateway } from "./square";
import { paypalGateway } from "./paypal";
import { nexiGateway } from "./nexi";
import { GATEWAY_IDS, isGatewayId, type GatewayId, type PaymentGateway } from "./types";

export type {
  GatewayId,
  GatewayMeta,
  GatewayKeyField,
  GatewayConnectionCheck,
  PaymentGateway,
  GatewayOrderContext,
} from "./types";
export { GATEWAY_IDS, isGatewayId } from "./types";

const SETTING_KEY = "payment_gateway";

const GATEWAYS: Record<GatewayId, PaymentGateway> = {
  stripe: stripeGateway,
  square: squareGateway,
  mollie: mollieGateway,
  paypal: paypalGateway,
  nexi: nexiGateway,
};

export function getGateway(id: GatewayId): PaymentGateway {
  return GATEWAYS[id];
}

/** Tous les prestataires, dans l'ordre déclaré (Stripe en premier). */
export function allGateways(): PaymentGateway[] {
  return GATEWAY_IDS.map((id) => GATEWAYS[id]);
}

export interface GatewayConfig {
  /** Prestataire actif, ou null si le paiement en ligne est désactivé. */
  provider: GatewayId | null;
  /** Clés des moyens de paiement (table PaymentMethod) encaissés en ligne. */
  methodKeys: string[];
}

const EMPTY_CONFIG: GatewayConfig = { provider: null, methodKeys: [] };

function coerce(value: unknown): GatewayConfig {
  if (!value || typeof value !== "object") return EMPTY_CONFIG;
  const raw = value as Record<string, unknown>;
  const provider = isGatewayId(raw.provider) ? raw.provider : null;
  const methodKeys = Array.isArray(raw.methodKeys)
    ? raw.methodKeys.filter((entry): entry is string => typeof entry === "string")
    : [];
  return { provider, methodKeys };
}

/** Configuration enregistrée, mise en cache pour la durée du rendu. */
export const getGatewayConfig = cache(async (): Promise<GatewayConfig> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return EMPTY_CONFIG;
    return coerce(JSON.parse(row.value));
  } catch {
    return EMPTY_CONFIG;
  }
});

export async function saveGatewayConfig(input: GatewayConfig): Promise<GatewayConfig> {
  const clean: GatewayConfig = {
    provider: input.provider && isGatewayId(input.provider) ? input.provider : null,
    methodKeys: Array.from(
      new Set(input.methodKeys.map((key) => key.trim()).filter((key) => key.length > 0)),
    ),
  };

  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: SETTING_KEY, value: JSON.stringify(clean) },
  });

  return clean;
}

/**
 * Prestataire à utiliser pour encaisser une commande réglée avec `methodKey`, ou
 * null si elle doit rester réglée hors ligne.
 *
 * Renvoie null dès qu'une condition manque — prestataire désactivé, moyen de
 * paiement non rattaché, clés absentes — de sorte qu'une configuration
 * incomplète fasse simplement retomber la commande sur le mode « offen » (comme
 * le virement) plutôt que d'échouer.
 */
export async function resolveGatewayForMethod(methodKey: string): Promise<PaymentGateway | null> {
  const config = await getGatewayConfig();
  if (!config.provider) return null;
  if (!config.methodKeys.includes(methodKey)) return null;
  const gateway = GATEWAYS[config.provider];
  if (!(await gateway.isConfigured())) return null;
  return gateway;
}

/**
 * S'assure que les lignes `Integration` de tous les prestataires existent, pour
 * que la saisie des clés en administration ne dépende pas d'un re-seed. Idempotent.
 */
export async function ensureGatewayIntegrations(): Promise<void> {
  const fields = allGateways().flatMap((gateway) =>
    gateway.meta.keys.map((key) => ({
      key: key.integrationKey,
      label: `${gateway.meta.label} — ${key.label}`,
      description: key.hint,
    })),
  );

  await Promise.all(
    fields.map((field) =>
      prisma.integration.upsert({
        where: { key: field.key },
        update: {},
        create: { key: field.key, label: field.label, description: field.description, enabled: false },
      }),
    ),
  );
}
