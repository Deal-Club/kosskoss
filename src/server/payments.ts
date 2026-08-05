import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";
import type { PaymentMethodRecord } from "@/server/types";

interface PaymentMethodRow {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  feeLabel: string;
  enabled: boolean;
  position: number;
}

export interface PaymentMethodInput {
  key?: string;
  label: string;
  description?: string;
  icon?: string;
  feeLabel?: string;
  enabled?: boolean;
  position?: number;
}

export type PaymentMethodPatch = Partial<Omit<PaymentMethodRecord, "id">>;

const DEFAULT_ICON = "credit-card";

function toRecord(row: PaymentMethodRow): PaymentMethodRecord {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    icon: row.icon,
    feeLabel: row.feeLabel,
    enabled: row.enabled,
    position: row.position,
  };
}

// Le "key" est stable et sert d'identifiant métier ; on garantit son unicité
// en suffixant, plutôt que de faire échouer la création côté interface.
async function uniqueKey(desired: string): Promise<string> {
  const base = slugify(desired) || "zahlungsart";
  let candidate = base;
  let suffix = 2;
  while (await prisma.paymentMethod.findUnique({ where: { key: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function listPaymentMethods(): Promise<PaymentMethodRecord[]> {
  const rows = await prisma.paymentMethod.findMany({
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });
  return rows.map(toRecord);
}

export async function listEnabledPaymentMethods(): Promise<PaymentMethodRecord[]> {
  const rows = await prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });
  return rows.map(toRecord);
}

export async function getPaymentMethod(id: string): Promise<PaymentMethodRecord | undefined> {
  const row = await prisma.paymentMethod.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export async function createPaymentMethod(
  input: PaymentMethodInput,
): Promise<PaymentMethodRecord> {
  const label = input.label.trim();
  if (!label) {
    throw new Error("Le nom du moyen de paiement est obligatoire.");
  }

  const key = await uniqueKey(input.key?.trim() || label);
  const last = await prisma.paymentMethod.findFirst({ orderBy: { position: "desc" } });
  const position = input.position ?? (last ? last.position + 1 : 0);

  const row = await prisma.paymentMethod.create({
    data: {
      key,
      label,
      description: input.description?.trim() ?? "",
      icon: input.icon?.trim() || DEFAULT_ICON,
      feeLabel: input.feeLabel?.trim() ?? "",
      enabled: input.enabled ?? true,
      position,
    },
  });
  return toRecord(row);
}

export async function updatePaymentMethod(
  id: string,
  patch: PaymentMethodPatch,
): Promise<PaymentMethodRecord | undefined> {
  const current = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!current) return undefined;

  const key =
    patch.key !== undefined && slugify(patch.key) !== current.key
      ? await uniqueKey(patch.key)
      : undefined;

  const row = await prisma.paymentMethod.update({
    where: { id: current.id },
    data: {
      key,
      label: patch.label?.trim() || undefined,
      description: patch.description?.trim() ?? undefined,
      icon: patch.icon?.trim() || undefined,
      feeLabel: patch.feeLabel?.trim() ?? undefined,
      enabled: typeof patch.enabled === "boolean" ? patch.enabled : undefined,
      position: typeof patch.position === "number" ? patch.position : undefined,
    },
  });
  return toRecord(row);
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  const current = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!current) return false;
  await prisma.paymentMethod.delete({ where: { id: current.id } });
  return true;
}

/**
 * Réordonne la liste : les identifiants reçus fixent les positions 0..n.
 * Les identifiants inconnus sont ignorés, les entrées absentes passent à la fin.
 */
export async function reorderPaymentMethods(ids: string[]): Promise<PaymentMethodRecord[]> {
  const rows = await prisma.paymentMethod.findMany({
    orderBy: [{ position: "asc" }, { label: "asc" }],
    select: { id: true },
  });

  const known = new Set(rows.map((row) => row.id));
  const ordered = ids.filter((id) => known.has(id));
  for (const row of rows) {
    if (!ordered.includes(row.id)) ordered.push(row.id);
  }

  await prisma.$transaction(
    ordered.map((id, position) =>
      prisma.paymentMethod.update({ where: { id }, data: { position } }),
    ),
  );

  return listPaymentMethods();
}

/** Verschiebt eine Zahlungsart um eine Position nach oben oder unten. */
export async function movePaymentMethod(
  id: string,
  direction: "up" | "down",
): Promise<PaymentMethodRecord[] | undefined> {
  const rows = await prisma.paymentMethod.findMany({
    orderBy: [{ position: "asc" }, { label: "asc" }],
    select: { id: true },
  });

  const ids = rows.map((row) => row.id);
  const index = ids.indexOf(id);
  if (index === -1) return undefined;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return listPaymentMethods();

  [ids[index], ids[target]] = [ids[target], ids[index]];
  return reorderPaymentMethods(ids);
}
