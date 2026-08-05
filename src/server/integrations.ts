import { prisma } from "@/server/prisma";
import { decryptSecret, encryptSecret, lastFourOf, maskFromLastFour } from "@/lib/secrets";
import { slugify } from "@/lib/slugify";
import type { IntegrationRecord } from "@/server/types";

interface IntegrationRow {
  id: string;
  key: string;
  label: string;
  description: string;
  secretCipher: string | null;
  lastFour: string | null;
  enabled: boolean;
  updatedAt: Date;
}

export interface IntegrationInput {
  key: string;
  label: string;
  description?: string;
}

// Le chiffré ne quitte jamais cette couche : seul le masque et l'état partent
// vers les routes API et les pages.
function toRecord(row: IntegrationRow): IntegrationRecord {
  const configured = Boolean(row.secretCipher);
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    enabled: row.enabled,
    maskedValue: configured ? maskFromLastFour(row.lastFour) : undefined,
    configured,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeKey(value: string): string {
  return slugify(value).replace(/-/g, "_");
}

/** Liefert alle Integrationen ohne Klartext-Geheimnisse. */
export async function listIntegrations(): Promise<IntegrationRecord[]> {
  const rows = await prisma.integration.findMany({ orderBy: { key: "asc" } });
  return rows.map(toRecord);
}

export async function getIntegration(key: string): Promise<IntegrationRecord | undefined> {
  const row = await prisma.integration.findUnique({ where: { key } });
  return row ? toRecord(row) : undefined;
}

export async function createIntegration(input: IntegrationInput): Promise<IntegrationRecord> {
  const key = normalizeKey(input.key);
  const label = input.label.trim();
  if (!key) {
    throw new Error("La clé est obligatoire.");
  }
  if (!label) {
    throw new Error("Le libellé est obligatoire.");
  }

  const existing = await prisma.integration.findUnique({ where: { key } });
  if (existing) {
    throw new Error(`La clé « ${key} » est déjà utilisée.`);
  }

  const row = await prisma.integration.create({
    data: {
      key,
      label,
      description: input.description?.trim() ?? "",
      enabled: false,
    },
  });
  return toRecord(row);
}

/** Enregistre un secret chiffré (AES-256-GCM) et ne retient que les quatre derniers caractères. */
export async function setIntegrationSecret(
  key: string,
  plain: string,
  updatedBy?: string,
): Promise<IntegrationRecord | undefined> {
  const value = plain.trim();
  if (!value) {
    throw new Error("La valeur ne peut pas être vide.");
  }

  const current = await prisma.integration.findUnique({ where: { key } });
  if (!current) return undefined;

  const row = await prisma.integration.update({
    where: { key: current.key },
    data: {
      secretCipher: encryptSecret(value),
      lastFour: lastFourOf(value),
      updatedBy: updatedBy ?? null,
    },
  });
  return toRecord(row);
}

/** Entfernt das gespeicherte Geheimnis und deaktiviert die Integration. */
export async function clearIntegrationSecret(
  key: string,
): Promise<IntegrationRecord | undefined> {
  const current = await prisma.integration.findUnique({ where: { key } });
  if (!current) return undefined;

  const row = await prisma.integration.update({
    where: { key: current.key },
    data: {
      secretCipher: null,
      lastFour: null,
      // Sans secret, l'intégration ne peut pas rester active.
      enabled: false,
      updatedBy: null,
    },
  });
  return toRecord(row);
}

export async function toggleIntegration(
  key: string,
  enabled: boolean,
): Promise<IntegrationRecord | undefined> {
  const current = await prisma.integration.findUnique({ where: { key } });
  if (!current) return undefined;

  if (enabled && !current.secretCipher) {
    throw new Error("Impossible d'activer l'intégration sans clé enregistrée.");
  }

  const row = await prisma.integration.update({
    where: { key: current.key },
    data: { enabled },
  });
  return toRecord(row);
}

export async function deleteIntegration(key: string): Promise<boolean> {
  const current = await prisma.integration.findUnique({ where: { key } });
  if (!current) return false;
  await prisma.integration.delete({ where: { key: current.key } });
  return true;
}

/**
 * SERVEUR UNIQUEMENT : rend le secret déchiffré d'une intégration de paiement
 * ou de transport. Cette valeur ne doit jamais sortir du serveur, ni par une
 * route, ni par une prop de composant, ni par un journal.
 */
export async function getIntegrationSecret(key: string): Promise<string | null> {
  const row = await prisma.integration.findUnique({ where: { key } });
  if (!row?.secretCipher) return null;
  return decryptSecret(row.secretCipher);
}
