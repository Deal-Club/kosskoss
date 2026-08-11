import { cache } from "react";
import { prisma } from "@/server/prisma";
import { packshot } from "@/lib/kk/packshot";

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

/** Produit mis en avant dans le méga-menu. */
export interface NavHighlight {
  id: string;
  brand: string;
  name: string;
  priceFcfa: number;
  image: string | null;
  href: string;
  /** « bestseller » ou « nouveau » ; null si le produit n'en porte pas. */
  badge: string | null;
}

/**
 * Deux produits montrés dans le méga-menu.
 *
 * Un menu de catalogue qui n'aligne que des noms de rayons demande au visiteur
 * de se projeter : il doit imaginer ce qu'il y a derrière « Sérums » avant de
 * cliquer. Deux vignettes réelles suffisent à faire basculer le menu de la
 * table des matières vers la vitrine — c'est le rôle qu'il tient dans une
 * boutique, et c'est là que se gagne le clic.
 *
 * Priorité aux produits badgés au back-office (« bestseller », « nouveau ») :
 * c'est le seul signal de mise en avant que le catalogue porte réellement.
 * À défaut, les dernières références entrées. Aucun classement inventé.
 */
export const getNavHighlights = cache(async (limit = 2): Promise<NavHighlight[]> => {
  const rows = await prisma.product.findMany({
    where: { active: true, badge: { in: ["bestseller", "nouveau"] } },
    orderBy: [{ badge: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: { category: { include: { group: true } } },
  });

  // Repli : catalogue sans aucun produit badgé — on montre les plus récents
  // plutôt que de laisser un trou dans le menu.
  const complement =
    rows.length < limit
      ? await prisma.product.findMany({
          where: { active: true, id: { notIn: rows.map((r) => r.id) } },
          orderBy: { createdAt: "desc" },
          take: limit - rows.length,
          include: { category: { include: { group: true } } },
        })
      : [];

  return [...rows, ...complement].map((row) => ({
    id: row.id,
    brand: row.brand,
    name: row.name,
    priceFcfa: row.priceCents,
    image: packshot(row.image),
    href: `/${row.category.group.slug}/${row.category.slug}/${row.slug}`,
    badge: row.badge,
  }));
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
