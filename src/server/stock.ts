import { prisma } from "@/server/prisma";
import type { StockMovementRecord } from "@/server/types";

// Gestion du stock : chaque variation est écrite avec son mouvement dans une
// même transaction, pour que le stock et l'historique ne divergent jamais.

/** Motifs autorisés — reflet des commentaires du schéma Prisma. */
export const STOCK_REASONS = ["wareneingang", "korrektur", "verkauf", "retoure"] as const;

export type StockReason = (typeof STOCK_REASONS)[number];

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  wareneingang: "Réception marchandise",
  korrektur: "Correction",
  verkauf: "Vente",
  retoure: "Retour",
};

export function isStockReason(value: unknown): value is StockReason {
  return typeof value === "string" && (STOCK_REASONS as readonly string[]).includes(value);
}

/**
 * Délai de transaction partagé par toutes les écritures de stock qui peuvent
 * se heurter au verrou d'une grosse réception (`recevoirLignes`,
 * `src/server/kk/bons.ts`, qui utilise ce même délai).
 *
 * Avant la correction, `adjustStock`/`setStock` gardaient le défaut Prisma de
 * 5 s alors que la réception peut retenir un verrou de ligne jusqu'à 30 s :
 * un client qui valide son panier sur un produit en cours de réception
 * attendait le verrou et voyait SA transaction expirer la première — l'échec
 * du magasinier se déplaçait vers le client, qui perd un panier qu'une
 * réception, elle, peut se permettre de relancer. Donner ici le même délai
 * qu'à la réception laisse le client attendre aussi longtemps que la
 * réception peut retenir le verrou, au lieu d'échouer plus tôt qu'elle.
 */
export const DELAI_TRANSACTION_STOCK_MS = 30_000;

export interface StockProductRow {
  id: string;
  brand: string;
  name: string;
  /** Catégorie sous la forme « univers/slug » */
  categoryId: string;
  categoryLabel: string;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
}

export interface StockAdjustmentResult {
  productId: string;
  /** Stock avant l'écriture */
  previousStock: number;
  /** Stock après l'écriture */
  stock: number;
  movement: StockMovementRecord;
}

const productSelect = {
  id: true,
  brand: true,
  name: true,
  stock: true,
  lowStockThreshold: true,
  active: true,
  category: { select: { slug: true, label: true, group: { select: { slug: true } } } },
} as const;

interface ProductStockRow {
  id: string;
  brand: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  category: { slug: string; label: string; group: { slug: string } };
}

function toStockProductRow(row: ProductStockRow): StockProductRow {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    categoryId: `${row.category.group.slug}/${row.category.slug}`,
    categoryLabel: row.category.label,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    active: row.active,
  };
}

interface MovementRow {
  id: string;
  productId: string;
  delta: number;
  reason: string;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
  product?: { brand: string; name: string } | null;
}

function toMovementRecord(row: MovementRow): StockMovementRecord {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product ? `${row.product.brand} ${row.product.name}` : undefined,
    delta: row.delta,
    reason: row.reason,
    note: row.note ?? undefined,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? undefined,
  };
}

// ---- Lecture ----

export async function listStockProducts(): Promise<StockProductRow[]> {
  const rows = await prisma.product.findMany({
    select: productSelect,
    orderBy: [{ category: { position: "asc" } }, { brand: "asc" }, { name: "asc" }],
  });
  return rows.map(toStockProductRow);
}

/** Produits dont le stock a atteint ou dépassé leur propre seuil d'alerte. */
export async function listLowStockProducts(): Promise<StockProductRow[]> {
  const rows = await prisma.product.findMany({
    // Référence de champ : comparaison colonne à colonne, sans tout charger en mémoire
    where: { stock: { lte: prisma.product.fields.lowStockThreshold } },
    select: productSelect,
    orderBy: [{ stock: "asc" }, { brand: "asc" }],
  });
  return rows.map(toStockProductRow);
}

export async function listStockMovements(
  filter?: { productId?: string; limit?: number },
): Promise<StockMovementRecord[]> {
  const limit = Math.min(Math.max(filter?.limit ?? 50, 1), 200);
  const rows = await prisma.stockMovement.findMany({
    where: filter?.productId ? { productId: filter.productId } : undefined,
    include: { product: { select: { brand: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toMovementRecord);
}

// ---- Écriture ----

/**
 * Enregistre une variation de stock. Le stock ne descend jamais sous 0 et c'est
 * l'écart réellement appliqué qui est journalisé, pour que l'historique et le
 * stock restent cohérents.
 */
export async function adjustStock(
  productId: string,
  delta: number,
  reason: string,
  note?: string,
  createdBy?: string,
): Promise<StockAdjustmentResult | undefined> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("La quantité doit être un nombre entier différent de zéro.");
  }

  return prisma.$transaction(async (tx) => {
    // `SELECT … FOR UPDATE` verrouille la ligne : une autre transaction qui
    // ajusterait le même produit attend ici plutôt que de lire un stock qui
    // va changer sous elle. Sans ce verrou, deux appels concurrents peuvent
    // lire le même stock de départ et l'un des deux deltas se perd — le
    // même défaut que celui corrigé dans `recevoirLignes`
    // (src/server/kk/bons.ts), pour la même raison : cette fonction déclare
    // en tête de fichier que le stock et son journal ne divergent jamais.
    const verrou = await tx.$queryRaw<{ stock: number }[]>`
      SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
    `;
    const current = verrou[0];
    if (!current) return undefined;

    const nextStock = Math.max(0, current.stock + delta);
    const effectiveDelta = nextStock - current.stock;
    if (effectiveDelta === 0) {
      throw new Error("Le stock est déjà à 0 et ne peut pas être réduit davantage.");
    }

    // Écrit en `{ increment }`, calculé sur le delta EFFECTIF (après le
    // plancher à zéro) — un incrément nu ne borne rien, le plancher doit donc
    // être appliqué avant l'écriture, pas après. La ligne reste verrouillée
    // depuis le `SELECT … FOR UPDATE` ci-dessus : cette lecture et cette
    // écriture forment un tout, aucune autre transaction ne peut s'intercaler.
    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: effectiveDelta } },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        delta: effectiveDelta,
        reason,
        note: note?.trim() ? note.trim() : null,
        createdBy: createdBy ?? null,
      },
      include: { product: { select: { brand: true, name: true } } },
    });

    return {
      productId,
      previousStock: current.stock,
      stock: nextStock,
      movement: toMovementRecord(movement),
    };
  }, { timeout: DELAI_TRANSACTION_STOCK_MS });
}

/** Fixe le stock à une valeur absolue et en déduit le mouvement correspondant. */
export async function setStock(
  productId: string,
  value: number,
  reason: string,
  createdBy?: string,
  note?: string,
): Promise<StockAdjustmentResult | undefined> {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Le stock doit être un nombre entier supérieur ou égal à 0.");
  }

  return prisma.$transaction(async (tx) => {
    // Même verrou que dans `adjustStock` ci-dessus, pour la même raison : sans
    // lui, deux appels concurrents liraient le même stock de départ et l'un
    // écraserait le mouvement de l'autre dans le journal. `setStock` fixe une
    // valeur ABSOLUE — ce n'est pas un delta reçu de l'appelant — donc
    // l'écriture reste `data: { stock: value }` plutôt qu'un `{ increment }` ;
    // le verrou garantit déjà que `delta` ci-dessous reflète le bon stock de
    // départ, ce qu'un incrément nu n'apporterait pas de plus ici.
    const verrou = await tx.$queryRaw<{ stock: number }[]>`
      SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
    `;
    const current = verrou[0];
    if (!current) return undefined;

    const delta = value - current.stock;
    if (delta === 0) {
      throw new Error("Le stock correspond déjà à cette valeur.");
    }

    await tx.product.update({ where: { id: productId }, data: { stock: value } });

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        delta,
        reason,
        note: note?.trim() ? note.trim() : null,
        createdBy: createdBy ?? null,
      },
      include: { product: { select: { brand: true, name: true } } },
    });

    return {
      productId,
      previousStock: current.stock,
      stock: value,
      movement: toMovementRecord(movement),
    };
  }, { timeout: DELAI_TRANSACTION_STOCK_MS });
}
