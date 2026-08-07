import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import type { KKProductView, KKTestimonialView } from "@/types/kk";

/**
 * Produits mis en avant sur l'accueil, lus en base.
 * Montants : le champ historique `priceCents` porte désormais un entier de
 * FCFA (pas de sous-unité) — voir docs/13, chantier « fondation FCFA ».
 * Renvoie une liste vide sans erreur si le catalogue est vide.
 */
export async function getHomeProducts(limit = 8): Promise<KKProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: PRODUCT_VIEW_INCLUDE,
  });

  return rows.map(toProductView);
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
