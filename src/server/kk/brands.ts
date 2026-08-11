import { cache } from "react";
import { prisma } from "@/server/prisma";

/**
 * Les maisons distribuées, avec de quoi les montrer.
 *
 * KossKoss Select est un concept-store MULTIMARQUE : c'est sa proposition, et
 * rien sur l'accueil ne la disait. Cette lecture donne, pour chaque maison
 * présente au catalogue, le nombre de références actives et un packshot qui la
 * représente — de quoi bâtir une vitrine de marques sans logo.
 *
 * Pourquoi pas de logos : le projet n'en possède aucun pour ces maisons. Le
 * dossier public/images/brands/ ne contient que ceux de l'ancien projet
 * électroménager. Un packshot réel vaut mieux qu'un logo manquant, et il montre
 * en plus ce qu'on vend.
 *
 * Aucune liste de marques n'est écrite en dur : la vitrine suit le catalogue.
 * Une maison qu'on cesse de distribuer disparaît d'elle-même, et une nouvelle
 * apparaît sans toucher au code.
 */

export interface BrandShowcaseItem {
  /** Nom de la maison, tel qu'il est saisi sur les fiches produit. */
  name: string;
  /** Références actives — c'est un compte réel, jamais un chiffre d'affichage. */
  productCount: number;
  /** Packshot représentatif. `null` si aucune référence de la maison n'a d'image. */
  image: string | null;
  /** Texte alternatif : le produit dont provient le packshot. */
  imageAlt: string;
  /** Rayon de la maison, préfixe de langue non compris. */
  href: string;
}

export const getBrandShowcase = cache(async (limit = 12): Promise<BrandShowcaseItem[]> => {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { brand: true, name: true, image: true, editorialRating: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const parMarque = new Map<string, { count: number; vitrine: (typeof rows)[number] | null }>();

  for (const row of rows) {
    const marque = row.brand.trim();
    if (!marque) continue;

    const entree = parMarque.get(marque) ?? { count: 0, vitrine: null };
    entree.count += 1;

    // Le packshot retenu : la référence la mieux notée par la rédaction parmi
    // celles qui ont une image. À note égale — ou sans note — la plus ancienne
    // gagne, ce qui rend la vitrine stable d'un rendu à l'autre. Une vitrine
    // qui change de visage à chaque visite ne construit aucune reconnaissance.
    if (row.image) {
      const actuel = entree.vitrine;
      const mieuxNote = (row.editorialRating ?? 0) > (actuel?.editorialRating ?? 0);
      if (!actuel || mieuxNote) entree.vitrine = row;
    }

    parMarque.set(marque, entree);
  }

  return [...parMarque.entries()]
    // Les maisons les mieux fournies d'abord : c'est chez elles que le clic a
    // le plus de chances de mener à un choix, et non à un rayon d'un article.
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], "fr"))
    .slice(0, limit)
    .map(([name, { count, vitrine }]) => ({
      name,
      productCount: count,
      image: vitrine?.image ?? null,
      imageAlt: vitrine?.name ?? name,
      href: `/recherche?q=${encodeURIComponent(name)}`,
    }));
});
