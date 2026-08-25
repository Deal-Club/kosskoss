/**
 * Gestion des routines au back-office : lister, créer, éditer (nom, besoin,
 * niveau, code, accroche, description, état) et gérer leurs produits (les
 * « gestes »), dans l'ordre. C'est la brique qui manquait — jusqu'ici une
 * routine n'existait que par l'import du master.
 *
 * La sauvegarde des gestes préserve `why`/`role`/`moment` des gestes conservés
 * (upsert par couple routine+produit) et ne supprime que les gestes retirés.
 */
import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";
import { NIVEAUX, LIBELLES_NIVEAUX, estNiveau } from "@/lib/kk/routines-niveau";
import { BESOIN_LABEL } from "./arbre-diagnostic";

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
  code: string;
  niveau: string;
  besoinTag: string;
  claim: string;
  description: string;
  active: boolean;
  steps: RoutineStepEdit[];
};

export type ProduitChoisissable = {
  id: string;
  label: string;
  categorie: string;
  servable: boolean;
};

/** Options du sélecteur de besoin (les sept besoins de la matrice). */
export const BESOIN_OPTIONS = Object.entries(BESOIN_LABEL).map(([value, label]) => ({ value, label }));

/** Options du sélecteur de niveau (Essentielle / Premium). */
export const NIVEAU_OPTIONS = NIVEAUX.map((value) => ({ value, label: LIBELLES_NIVEAUX[value] }));

export type RoutineListe = {
  id: string;
  name: string;
  besoinTag: string;
  besoinLabel: string;
  niveau: string;
  niveauLabel: string;
  code: string | null;
  active: boolean;
  total: number;
  servables: number;
};

function libelleBesoin(tag: string): string {
  return (BESOIN_LABEL as Record<string, string>)[tag] ?? tag ?? "—";
}
function libelleNiveau(niveau: string): string {
  return estNiveau(niveau) ? LIBELLES_NIVEAUX[niveau] : niveau;
}

export async function listerRoutinesAdmin(): Promise<RoutineListe[]> {
  const rows = await prisma.routine.findMany({
    orderBy: [{ besoinTag: "asc" }, { niveau: "asc" }, { name: "asc" }],
    include: { steps: { include: { product: { select: { active: true, stock: true } } } } },
  });
  return rows.map((r) => {
    const servables = r.steps.filter((s) => s.product.active && s.product.stock > 0).length;
    return {
      id: r.id,
      name: r.name,
      besoinTag: r.besoinTag,
      besoinLabel: libelleBesoin(r.besoinTag),
      niveau: r.niveau,
      niveauLabel: libelleNiveau(r.niveau),
      code: r.code,
      active: r.active,
      total: r.steps.length,
      servables,
    };
  });
}

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
    code: row.code ?? "",
    niveau: row.niveau,
    besoinTag: row.besoinTag,
    claim: row.claim,
    description: row.description,
    active: row.active,
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
  besoinTag: string;
  niveau: string;
  code: string;
  claim: string;
  description: string;
  active: boolean;
  steps: { productId: string; label: string }[];
};

/** Valide un corps de requête brut en `RoutineSaveInput`, ou `null` si malformé. */
export function parseRoutineBody(body: unknown): RoutineSaveInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.steps)) return null;

  const steps: { productId: string; label: string }[] = [];
  for (const raw of b.steps) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const productId = typeof r.productId === "string" ? r.productId.trim() : "";
    if (productId) steps.push({ productId, label: typeof r.label === "string" ? r.label : "" });
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(b.name),
    besoinTag: str(b.besoinTag),
    niveau: str(b.niveau),
    code: str(b.code),
    claim: str(b.claim),
    description: str(b.description),
    active: b.active !== false,
    steps,
  };
}

/** Erreur métier renvoyée en 409 (code déjà pris). */
export class RoutineConflit extends Error {}

function nettoyerChamps(input: RoutineSaveInput) {
  return {
    name: input.name.trim() || "Routine",
    besoinTag: input.besoinTag.trim(),
    niveau: estNiveau(input.niveau) ? input.niveau : "eco",
    code: input.code.trim(),
    claim: input.claim.trim(),
    description: input.description.trim(),
    active: input.active,
  };
}

function stepsNormalises(input: RoutineSaveInput) {
  return input.steps
    .filter((s) => s.productId)
    .map((s, position) => ({ productId: s.productId, label: s.label.trim() || "Soin", position }));
}

/** Écrit les gestes (upsert conservant why/role/moment, suppression des retirés). */
function operationsGestes(routineId: string, steps: { productId: string; label: string; position: number }[]) {
  const gardes = steps.map((s) => s.productId);
  return [
    prisma.routineStep.deleteMany({
      where: { routineId, productId: { notIn: gardes.length ? gardes : ["__aucun__"] } },
    }),
    ...steps.map((s) =>
      prisma.routineStep.upsert({
        where: { routineId_productId: { routineId, productId: s.productId } },
        update: { label: s.label, position: s.position },
        create: { routineId, productId: s.productId, label: s.label, position: s.position },
      }),
    ),
  ];
}

async function slugUnique(base: string, exclureId?: string): Promise<string> {
  const racine = slugify(base) || "routine";
  let slug = racine;
  let i = 2;
  // Boucle bornée : au pire quelques itérations, jamais infinie en pratique.
  while (true) {
    const existant = await prisma.routine.findUnique({ where: { slug }, select: { id: true } });
    if (!existant || existant.id === exclureId) return slug;
    slug = `${racine}-${i++}`;
  }
}

export async function enregistrerRoutine(id: string, input: RoutineSaveInput): Promise<void> {
  const champs = nettoyerChamps(input);
  const steps = stepsNormalises(input);

  // Unicité du code : NULL si vide (plusieurs routines sans code coexistent).
  if (champs.code) {
    const autre = await prisma.routine.findUnique({ where: { code: champs.code }, select: { id: true } });
    if (autre && autre.id !== id) throw new RoutineConflit("Ce code de routine est déjà utilisé.");
  }

  await prisma.$transaction([
    prisma.routine.update({
      where: { id },
      data: {
        name: champs.name,
        besoinTag: champs.besoinTag,
        niveau: champs.niveau,
        code: champs.code || null,
        claim: champs.claim,
        description: champs.description,
        active: champs.active,
      },
    }),
    ...operationsGestes(id, steps),
  ]);
}

export async function creerRoutine(input: RoutineSaveInput): Promise<string> {
  const champs = nettoyerChamps(input);
  const steps = stepsNormalises(input);

  if (champs.code) {
    const autre = await prisma.routine.findUnique({ where: { code: champs.code }, select: { id: true } });
    if (autre) throw new RoutineConflit("Ce code de routine est déjà utilisé.");
  }

  const slug = await slugUnique(champs.name);
  const dernier = await prisma.routine.findFirst({ orderBy: { position: "desc" }, select: { position: true } });

  const routine = await prisma.routine.create({
    data: {
      slug,
      name: champs.name,
      besoinTag: champs.besoinTag,
      niveau: champs.niveau,
      code: champs.code || null,
      claim: champs.claim,
      description: champs.description,
      active: champs.active,
      position: (dernier?.position ?? 0) + 1,
    },
  });

  if (steps.length) {
    await prisma.routineStep.createMany({
      data: steps.map((s) => ({ routineId: routine.id, productId: s.productId, label: s.label, position: s.position })),
    });
  }

  return routine.id;
}

export async function supprimerRoutine(id: string): Promise<void> {
  // Les gestes tombent en cascade (RoutineStep.onDelete: Cascade).
  await prisma.routine.delete({ where: { id } });
}
