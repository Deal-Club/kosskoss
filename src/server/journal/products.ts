/**
 * Résolution des produits cités par un bloc « productCard ».
 *
 * L'article ne stocke que des slugs : le prix, le stock, le badge et la
 * disponibilité sont lus au rendu, dans le catalogue. C'est le même
 * raisonnement que sur les routines — un prix recopié dans un contenu
 * éditorial se désaligne au premier changement de tarif, et personne ne pense à
 * rouvrir un article de l'an dernier pour le corriger.
 *
 * Un slug qui ne correspond plus à rien (produit retiré, renommé) disparaît
 * simplement du bloc : un article ne casse pas parce que le catalogue a bougé.
 */

import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "@/server/kk/product-view";
import type { JournalBlock } from "@/types/journal";
import type { KKProductView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

/** Tous les slugs cités par les blocs produits d'un article. */
function citedSlugs(blocks: readonly JournalBlock[]): string[] {
  const slugs = new Set<string>();
  for (const block of blocks) {
    if (block.kind === "productCard") {
      for (const slug of block.slugs) slugs.add(slug);
    }
  }
  return [...slugs];
}

/**
 * Produits actifs cités par l'article, indexés par slug.
 * Une seule requête, quel que soit le nombre de blocs produits.
 */
export async function resolveCitedProducts(
  blocks: readonly JournalBlock[],
  locale: Locale,
): Promise<Map<string, KKProductView>> {
  const slugs = citedSlugs(blocks);
  if (slugs.length === 0) return new Map();

  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs }, active: true },
    include: PRODUCT_VIEW_INCLUDE,
  });

  return new Map(rows.map((row, index) => [row.slug, toProductView(row, locale, index)]));
}
