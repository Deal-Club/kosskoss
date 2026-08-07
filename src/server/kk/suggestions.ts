import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import type { KKProductView } from "@/types/kk";

/**
 * Produits suggérés dans le tiroir du panier.
 *
 * La suggestion part de ce que le client a déjà choisi : on propose d'abord des
 * références des mêmes rayons, puisqu'une personne qui achète un nettoyant
 * complète plus volontiers sa routine qu'elle ne bifurque vers un tout autre
 * univers. Si le rayon ne suffit pas à remplir la rangée, on complète par le
 * reste du catalogue plutôt que d'afficher un bloc à moitié vide.
 *
 * Deux exclusions systématiques : ce qui est déjà au panier — le proposer
 * donnerait l'impression que la boutique ne suit pas —, et tout ce qui est en
 * rupture, qu'il serait vexant de mettre en avant.
 *
 * Aucune notion de « souvent achetés ensemble » ici : il faudrait un historique
 * de commandes qui n'existe pas encore. Le jour où il existera, c'est cette
 * fonction qu'il faudra reprendre, et elle seule.
 */

/** Nombre de suggestions rendues. Trois tiennent dans le tiroir sans le noyer. */
const COMBIEN = 3;

export async function getCartSuggestions(
  productIds: string[],
  limit = COMBIEN,
): Promise<KKProductView[]> {
  const auPanier = [...new Set(productIds.filter((id) => typeof id === "string" && id))];

  // Rayons déjà représentés dans le panier.
  const categories =
    auPanier.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: auPanier } },
          select: { categoryId: true },
          distinct: ["categoryId"],
        })
      : [];
  const categorieIds = categories.map((c) => c.categoryId);

  const commun = {
    active: true,
    stock: { gt: 0 },
    ...(auPanier.length > 0 ? { id: { notIn: auPanier } } : {}),
  };

  // Premier tour : le même rayon.
  const proches =
    categorieIds.length > 0
      ? await prisma.product.findMany({
          where: { ...commun, categoryId: { in: categorieIds } },
          include: PRODUCT_VIEW_INCLUDE,
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : [];

  if (proches.length >= limit) return proches.map(toProductView);

  // Second tour : le reste du catalogue, sans reprendre ce qu'on a déjà retenu.
  const dejaRetenus = proches.map((p) => p.id);
  const complement = await prisma.product.findMany({
    where: { ...commun, id: { notIn: [...auPanier, ...dejaRetenus] } },
    include: PRODUCT_VIEW_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit - proches.length,
  });

  return [...proches, ...complement].map(toProductView);
}
