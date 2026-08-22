import { prisma } from "@/server/prisma";

/**
 * Fournisseurs.
 *
 * Une entité volontairement simple : nom, coordonnées, notes, actif. Le seul
 * point d'attention est la suppression — un fournisseur rattaché à des bons de
 * commande (`onDelete: Restrict` en base) ne peut pas disparaître sans les
 * emporter dans un silence total. Le refus dit combien de bons s'y opposent,
 * plutôt que de renvoyer une contrainte de clé étrangère brute que personne au
 * back-office ne saurait lire.
 */

export interface SupplierRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
  /** Bons de commande rattachés, tous statuts confondus. */
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  active?: boolean;
}

type SupplierRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { orders: number };
};

const avecCompte = { _count: { select: { orders: true } } } as const;

function versRecord(row: SupplierRow): SupplierRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    active: row.active,
    orderCount: row._count.orders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Champs assainis, communs à la création et à la modification. */
function donnees(entree: SupplierInput) {
  return {
    email: (entree.email ?? "").trim(),
    phone: (entree.phone ?? "").trim(),
    address: (entree.address ?? "").trim(),
    notes: (entree.notes ?? "").trim(),
    active: entree.active !== false,
  };
}

export async function listSuppliers(): Promise<SupplierRecord[]> {
  const rows = await prisma.supplier.findMany({
    include: avecCompte,
    orderBy: { name: "asc" },
  });
  return rows.map(versRecord);
}

export async function getSupplier(id: string): Promise<SupplierRecord | null> {
  const row = await prisma.supplier.findUnique({ where: { id }, include: avecCompte });
  return row ? versRecord(row) : null;
}

export async function createSupplier(entree: SupplierInput): Promise<SupplierRecord> {
  const name = entree.name.trim();
  if (!name) throw new Error("Le nom du fournisseur est obligatoire.");

  const cree = await prisma.supplier.create({
    data: { name, ...donnees(entree) },
    include: avecCompte,
  });
  return versRecord(cree);
}

export async function updateSupplier(
  id: string,
  entree: SupplierInput,
): Promise<SupplierRecord | null> {
  const existe = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;

  const name = entree.name.trim();
  if (!name) throw new Error("Le nom du fournisseur est obligatoire.");

  const modifie = await prisma.supplier.update({
    where: { id },
    data: { name, ...donnees(entree) },
    include: avecCompte,
  });
  return versRecord(modifie);
}

/**
 * Supprime un fournisseur, uniquement s'il n'a aucun bon de commande rattaché.
 *
 * `onDelete: Restrict` sur `PurchaseOrder.supplierId` refuserait de toute
 * façon la requête en base — mais avec un message de contrainte de clé
 * étrangère, illisible pour qui administre. Compter d'abord permet un refus
 * qui dit CONTRE QUOI on bute : un refus muet est un refus qu'on ne comprend
 * pas.
 */
export async function deleteSupplier(id: string): Promise<boolean> {
  const existe = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return false;

  const nombreBons = await prisma.purchaseOrder.count({ where: { supplierId: id } });
  if (nombreBons > 0) {
    throw new Error(
      nombreBons === 1
        ? "Suppression impossible : 1 bon de commande est rattaché à ce fournisseur."
        : `Suppression impossible : ${nombreBons} bons de commande sont rattachés à ce fournisseur.`,
    );
  }

  await prisma.supplier.delete({ where: { id } });
  return true;
}
