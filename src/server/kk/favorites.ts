import { prisma } from "@/server/prisma";
import type { KKFavoriteView } from "@/types/kk";

/**
 * Favoris d'un client connecté.
 *
 * Rien n'est recopié du catalogue : la table ne retient que le couple
 * (client, produit). Le prix, la photo et le stock sont relus à chaque
 * affichage, donc un produit dont le tarif a changé apparaît au tarif du jour,
 * et un produit désactivé disparaît de la liste au lieu de traîner un prix
 * périmé — mémoriser un article n'est pas le réserver.
 */

/** Nombre maximal de favoris par compte. Au-delà, l'ajout est refusé. */
export const MAX_FAVORITES = 200;

const FAVORITE_INCLUDE = {
  product: { include: { category: { include: { group: true } } } },
} as const;

type FavoriteRow = {
  createdAt: Date;
  product: {
    id: string;
    slug: string;
    brand: string;
    name: string;
    priceCents: number;
    oldPriceCents: number | null;
    image: string | null;
    stock: number;
    category: { slug: string; group: { slug: string } };
  };
};

function toFavoriteView(row: FavoriteRow, hasVariants: boolean): KKFavoriteView {
  const p = row.product;
  return {
    productId: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    priceFcfa: p.priceCents,
    oldPriceFcfa: p.oldPriceCents ?? undefined,
    image: p.image ?? "",
    path: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
    stock: p.stock,
    hasVariants,
    addedAt: row.createdAt.getTime(),
  };
}

/**
 * Liste complète, du plus récemment ajouté au plus ancien.
 * Les produits désactivés sont écartés de l'affichage mais laissés en base :
 * un produit remis en vente réapparaît dans les favoris de ceux qui l'y avaient
 * mis, sans qu'ils aient à refaire le geste.
 */
export async function listFavorites(customerId: string): Promise<KKFavoriteView[]> {
  const rows = await prisma.customerFavorite.findMany({
    where: { customerId, product: { active: true } },
    orderBy: { createdAt: "desc" },
    include: FAVORITE_INCLUDE,
  });

  if (rows.length === 0) return [];

  // Une seule requête pour savoir quels produits se déclinent en contenances,
  // plutôt qu'un `include` de variations sur chaque ligne.
  const withVariants = await prisma.productVariant.findMany({
    where: { active: true, productId: { in: rows.map((r) => r.product.id) } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const variantIds = new Set(withVariants.map((v) => v.productId));

  return rows.map((row) => toFavoriteView(row, variantIds.has(row.product.id)));
}

/**
 * Ajoute un produit aux favoris. Sans effet s'il y figure déjà — le geste est
 * idempotent, deux onglets ne créent pas deux lignes (contrainte d'unicité).
 * Renvoie `false` si le produit n'existe pas, n'est plus actif, ou si le compte
 * a atteint le plafond.
 */
export async function addFavorite(customerId: string, productId: string): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    select: { id: true },
  });
  if (!product) return false;

  const existing = await prisma.customerFavorite.findUnique({
    where: { customerId_productId: { customerId, productId } },
    select: { id: true },
  });
  if (existing) return true;

  const count = await prisma.customerFavorite.count({ where: { customerId } });
  if (count >= MAX_FAVORITES) return false;

  await prisma.customerFavorite.create({ data: { customerId, productId } });
  return true;
}

export async function removeFavorite(customerId: string, productId: string): Promise<void> {
  await prisma.customerFavorite.deleteMany({ where: { customerId, productId } });
}

export async function clearFavorites(customerId: string): Promise<void> {
  await prisma.customerFavorite.deleteMany({ where: { customerId } });
}

/**
 * Verse dans le compte les favoris accumulés dans le navigateur avant la
 * connexion.
 *
 * Fusion, jamais remplacement : ce que le client avait déjà sur son compte est
 * conservé. `skipDuplicates` laisse la base arbitrer les doublons, et les
 * identifiants inconnus ou inactifs sont filtrés avant l'écriture — la liste
 * arrive du navigateur, elle n'est donc pas digne de confiance.
 */
export async function mergeFavorites(customerId: string, productIds: string[]): Promise<void> {
  const wanted = [...new Set(productIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (wanted.length === 0) return;

  const room = MAX_FAVORITES - (await prisma.customerFavorite.count({ where: { customerId } }));
  if (room <= 0) return;

  const known = await prisma.product.findMany({
    where: { id: { in: wanted.slice(0, MAX_FAVORITES) }, active: true },
    select: { id: true },
  });
  if (known.length === 0) return;

  await prisma.customerFavorite.createMany({
    data: known.slice(0, room).map((p) => ({ customerId, productId: p.id })),
    skipDuplicates: true,
  });
}
