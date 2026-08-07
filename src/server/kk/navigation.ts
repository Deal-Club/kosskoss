import { cache } from "react";
import { prisma } from "@/server/prisma";

/**
 * Navigation de la boutique, lue en base.
 *
 * Les univers et catégories étaient jusqu'ici écrits en dur dans l'en-tête :
 * ajouter une catégorie au back-office la laissait invisible, et en retirer une
 * laissait un lien mort. La navigation suit désormais le catalogue.
 *
 * `cache()` de React garantit une seule requête par rendu, même si l'en-tête,
 * le menu mobile et le pied de page la demandent chacun de leur côté.
 */

export interface NavCategory {
  slug: string;
  label: string;
  /** Chemin complet, préfixe de langue non compris. */
  href: string;
  productCount: number;
}

export interface NavGroup {
  slug: string;
  label: string;
  href: string;
  categories: NavCategory[];
}

export const getShopNavigation = cache(async (): Promise<NavGroup[]> => {
  const groups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  return (
    groups
      .map((group) => ({
        slug: group.slug,
        label: group.label,
        href: `/${group.slug}`,
        categories: group.categories
          // Une catégorie vide n'a rien à proposer : elle mènerait à une page
          // vide et donnerait l'impression d'une boutique en travaux.
          .filter((category) => category._count.products > 0)
          .map((category) => ({
            slug: category.slug,
            label: category.label,
            href: `/${group.slug}/${category.slug}`,
            productCount: category._count.products,
          })),
      }))
      .filter((group) => group.categories.length > 0)
  );
});

/** Marques présentes au catalogue, par ordre alphabétique. */
export const getShopBrands = cache(async (): Promise<string[]> => {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((row) => row.brand).filter((brand) => brand.length > 0);
});
