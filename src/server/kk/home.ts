import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import type { KKProductView, KKTestimonialView } from "@/types/kk";

/**
 * Produits mis en avant sur l'accueil, lus en base.
 *
 * Le catalogue est chargé marque par marque : trié par date de création, il
 * remplissait les rangées avec huit références d'une seule maison. Une
 * « sélection » qui ne montre qu'une marque dit l'inverse de ce qu'elle
 * annonce, sur une boutique qui en distribue douze.
 *
 * On alterne donc les marques : une par tour, dans l'ordre du catalogue, puis
 * on recommence. Chaque rangée de quatre montre ainsi quatre maisons
 * différentes tant qu'il y en a assez, et l'ordre reste stable d'un rendu à
 * l'autre — pas d'aléatoire, qui interdirait toute mise en cache.
 *
 * Montants : le champ historique `priceCents` porte un entier de FCFA (pas de
 * sous-unité) — voir docs/13, chantier « fondation FCFA ».
 * Renvoie une liste vide sans erreur si le catalogue est vide.
 */
export async function getHomeProducts(limit = 8): Promise<KKProductView[]> {
  // On lit plus large que nécessaire : l'alternance a besoin de choix, sinon
  // elle ne fait que réordonner les mêmes produits d'une même marque.
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    take: Math.max(limit * 6, 60),
    include: PRODUCT_VIEW_INCLUDE,
  });

  // Une file par marque, dans l'ordre d'apparition.
  const parMarque = new Map<string, typeof rows>();
  for (const row of rows) {
    const file = parMarque.get(row.brand);
    if (file) file.push(row);
    else parMarque.set(row.brand, [row]);
  }

  // Tour de table : on prend une référence chez chaque marque, puis on
  // recommence jusqu'à atteindre la limite ou épuiser le catalogue lu.
  const files = [...parMarque.values()];
  const choisis: typeof rows = [];
  for (let tour = 0; choisis.length < limit; tour += 1) {
    const avant = choisis.length;
    for (const file of files) {
      if (choisis.length >= limit) break;
      if (tour < file.length) choisis.push(file[tour]);
    }
    if (choisis.length === avant) break; // toutes les files sont épuisées
  }

  return choisis.map(toProductView);
}

/**
 * Avis clients affichés sur l'accueil.
 *
 * Trois garde-fous, parce que le bloc est titré « Avis clients » et qu'un
 * visiteur doit pouvoir s'y fier :
 *   1. `status: "approved"` — seuls les avis passés par la modération sortent ;
 *   2. note minimale de 4 — l'accueil est une vitrine, la fiche produit porte
 *      l'intégralité des avis, bons comme mauvais ;
 *   3. corps d'au moins 40 caractères — un « super » isolé n'apporte rien.
 *
 * Renvoie une liste vide tant qu'aucun avis réel n'est publié : la section se
 * masque alors d'elle-même, comme les rails produits. Aucun texte de repli
 * n'est inventé.
 */
export async function getHomeTestimonials(limit = 3): Promise<KKTestimonialView[]> {
  const rows = await prisma.review.findMany({
    where: { status: "approved", rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { product: { select: { brand: true, name: true } } },
  });

  return rows
    .filter((r) => r.body.trim().length >= 40)
    .map((r) => ({
      id: r.id,
      quote: r.body.trim(),
      author: r.authorName,
      city: r.city ?? undefined,
      rating: r.rating,
      productName: `${r.product.brand} ${r.product.name}`,
    }));
}
