/**
 * État consolidé des prestataires pour l'écran d'administration : quels
 * prestataires existent, lesquels sont réellement implémentés, quelles clés sont
 * déjà renseignées, et quel prestataire est actif. Assemblé côté serveur pour
 * qu'aucun secret ne parte vers le navigateur — seul le fait qu'une clé soit
 * « renseignée ou non » traverse.
 */

import { listIntegrations } from "@/server/integrations";
import { allGateways, ensureGatewayIntegrations, getGatewayConfig } from "./index";
import type { GatewayId } from "./types";

export interface GatewayKeyState {
  integrationKey: string;
  label: string;
  hint: string;
  configured: boolean;
  optional: boolean;
}

export interface GatewayState {
  id: GatewayId;
  label: string;
  availability: string;
  implemented: boolean;
  /** Avertissement à afficher, quand l'adaptateur n'a pas été éprouvé. */
  caution?: string;
  /** Vrai si le prestataire sait vérifier ses clés sans encaisser. */
  testable: boolean;
  keys: GatewayKeyState[];
}

export interface GatewayAdminState {
  provider: GatewayId | null;
  methodKeys: string[];
  gateways: GatewayState[];
}

export async function getGatewayAdminState(): Promise<GatewayAdminState> {
  // Garantit l'existence des lignes Integration avant d'en lire l'état : sans
  // cela, un prestataire jamais configuré n'apparaîtrait pas comme « à saisir ».
  await ensureGatewayIntegrations();

  const [config, integrations] = await Promise.all([getGatewayConfig(), listIntegrations()]);
  const configured = new Set(
    integrations.filter((integration) => integration.configured).map((integration) => integration.key),
  );

  const gateways: GatewayState[] = allGateways().map((gateway) => ({
    id: gateway.meta.id,
    label: gateway.meta.label,
    availability: gateway.meta.availability,
    implemented: gateway.meta.implemented,
    ...(gateway.meta.caution ? { caution: gateway.meta.caution } : {}),
    testable: typeof gateway.verifyConnection === "function",
    keys: gateway.meta.keys.map((key) => ({
      integrationKey: key.integrationKey,
      label: key.label,
      hint: key.hint,
      configured: configured.has(key.integrationKey),
      optional: key.optional === true,
    })),
  }));

  return { provider: config.provider, methodKeys: config.methodKeys, gateways };
}
