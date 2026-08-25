/**
 * Édition d'une routine au back-office : son nom et surtout ses produits
 * (les « gestes »), dans l'ordre. C'est la brique qui manquait — jusqu'ici une
 * routine n'existait que par l'import du master.
 *
 * La sauvegarde préserve `why`/`role`/`moment` des gestes conservés (upsert par
 * couple routine+produit) et ne supprime que les gestes réellement retirés :
 * réordonner ou renommer un geste ne perd pas son motif rédigé pour le master.
 */
import { prisma } from "@/server/prisma";

export type RoutineStepEdit = {
  productId: string;
  productLabel: string;
  /** Nom du « geste » affiché au client (ex. « Nettoyer »). */
  label: string;
  /** Produit actif ET en stock : sinon le geste est ignoré côté client. */
  servable: boolean;
};

export type RoutineAdmin = {
  id: string;
  name: string;
  code: string | null;
  niveau: string;
  besoinTag: string;
  steps: RoutineStepEdit[];
};

export type ProduitChoisissable = {
  id: string;
  label: string;
  categorie: string;
  servable: boolean;
};

export async function lireRoutineAdmin(id: string): Promise<RoutineAdmin | null> {
  const row = await prisma.routine.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { position: "asc" },
        include: { product: { select: { id: true, brand: true, name: true, active: true, stock: true } } },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    niveau: row.niveau,
    besoinTag: row.besoinTag,
    steps: row.steps.map((s) => ({
      productId: s.productId,
      productLabel: `${s.product.brand} — ${s.product.name}`,
      label: s.label,
      servable: s.product.active && s.product.stock > 0,
    })),
  };
}

/** Tous les produits, pour le sélecteur d'ajout d'un geste. */
export async function listerProduitsPourRoutine(): Promise<ProduitChoisissable[]> {
  const rows = await prisma.product.findMany({
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    select: {
      id: true,
      brand: true,
      name: true,
      active: true,
      stock: true,
      category: { select: { label: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    label: `${p.brand} — ${p.name}`,
    categorie: p.category.label,
    servable: p.active && p.stock > 0,
  }));
}

export type RoutineSaveInput = {
  name: string;
  steps: { productId: string; label: string }[];
};

/**
 * Enregistre le nom et les gestes d'une routine. Upsert par (routineId,
 * productId) — l'index unique du schéma — puis suppression des gestes retirés.
 */
export async function enregistrerRoutine(id: string, input: RoutineSaveInput): Promise<void> {
  const name = input.name.trim();
  const steps = input.steps
    .filter((s) => s.productId)
    .map((s, position) => ({ productId: s.productId, label: s.label.trim() || "Soin", position }));
  const gardes = new Set(steps.map((s) => s.productId));

  await prisma.$transaction([
    prisma.routine.update({ where: { id }, data: { name: name || "Routine" } }),
    // Retire les gestes dont le produit a été enlevé.
    prisma.routineStep.deleteMany({
      where: { routineId: id, productId: { notIn: steps.length ? [...gardes] : ["__aucun__"] } },
    }),
    // Ajoute / met à jour les gestes conservés (position + libellé).
    ...steps.map((s) =>
      prisma.routineStep.upsert({
        where: { routineId_productId: { routineId: id, productId: s.productId } },
        update: { label: s.label, position: s.position },
        create: { routineId: id, productId: s.productId, label: s.label, position: s.position },
      }),
    ),
  ]);
}
