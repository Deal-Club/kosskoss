import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
import { pickText, needsTranslation } from "@/server/localizedContent";
import type { KKProductView, KKReviewsSummary, KKTestimonialView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

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
export async function getHomeProducts(limit: number, locale: Locale): Promise<KKProductView[]> {
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

  return choisis.map((row, index) => toProductView(row, locale, index));
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
export async function getHomeTestimonials(limit = 3, locale: Locale = "fr"): Promise<KKTestimonialView[]> {
  const traduire = needsTranslation(locale);
  // On lit plus large que la limite : le filtre sur la longueur du corps
  // s'applique APRÈS la requête, et sans marge une série d'avis courts
  // renverrait une liste vide alors que la base en contient d'utilisables.
  const rows = await prisma.review.findMany({
    where: { status: "approved", rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: Math.max(limit * 4, 24),
    include: {
      product: {
        select: {
          brand: true,
          name: true,
          slug: true,
          category: { select: { slug: true, group: { select: { slug: true } } } },
        },
      },
    },
  });

  // Texte dans la langue de la page — voir `Review.titleEn`/`bodyEn` et la
  // même règle de repli (`pickText`) que le reste du catalogue. Le filtre de
  // longueur porte sur ce texte-là, pas sur le français sous-jacent : un avis
  // dont la traduction serait plus courte doit être jugé sur ce qu'il montre
  // réellement à l'écran.
  return rows
    .map((r) => ({
      id: r.id,
      quote: pickText(r.body, traduire ? r.bodyEn : undefined).trim(),
      author: r.authorName,
      city: r.city ?? undefined,
      rating: r.rating,
      productName: `${r.product.brand} ${r.product.name}`,
      title: pickText(r.title, traduire ? r.titleEn : undefined).trim() || undefined,
      href: `/${r.product.category.group.slug}/${r.product.category.slug}/${r.product.slug}`,
      publishedAt: r.createdAt.toISOString(),
    }))
    .filter((r) => r.quote.length >= 40)
    .slice(0, limit);
}

/**
 * Note moyenne et répartition des avis publiés.
 *
 * Calculées en base sur les seuls avis MODÉRÉS, et sur TOUTES les notes — y
 * compris les mauvaises. C'est la différence entre une note moyenne et un
 * argument de vente : `getHomeTestimonials` ne montre que des avis à 4 et 5
 * parce que l'accueil est une vitrine, mais la moyenne affichée à côté doit
 * porter sur l'ensemble, sans quoi elle serait fausse — et une note inventée
 * ou tronquée relève de la pratique commerciale trompeuse (article L121-2 du
 * Code de la consommation).
 *
 * Renvoie `total: 0` tant qu'aucun avis n'est publié ; la section se masque
 * alors d'elle-même plutôt que d'afficher un « 0/5 » ou une note de repli.
 */
export async function getReviewsSummary(): Promise<KKReviewsSummary> {
  const [agg, parNote] = await Promise.all([
    prisma.review.aggregate({
      where: { status: "approved" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { status: "approved" },
      _count: { _all: true },
    }),
  ]);

  const total = agg._count._all;
  if (total === 0) return { average: 0, total: 0, distribution: [] };

  const compte = new Map(parNote.map((n) => [n.rating, n._count._all]));

  return {
    // Arrondi au dixième : afficher « 4,7 » et non « 4,6666666666667 ».
    average: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    total,
    // De 5 à 1, et toutes les notes présentes même à zéro : une répartition à
    // trous se lit mal, et l'absence de 1 et 2 étoiles est en soi une
    // information.
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: compte.get(rating) ?? 0,
    })),
  };
}
