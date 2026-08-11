import { prisma } from "@/server/prisma";

/**
 * Avis PUBLIÉS d'un produit, tels que la fiche les montre.
 *
 * Distinct de `server/reviews.ts`, qui sert la modération et manipule des
 * enregistrements complets — adresse e-mail de l'auteur, note du modérateur,
 * statut. Rien de tout cela ne doit traverser la frontière serveur/client :
 * cette lecture ne renvoie que ce qui s'affiche.
 *
 * Un seul filtre, et il n'est pas négociable : `status: "approved"`. Les avis
 * arrivent en `pending` et n'apparaissent nulle part tant qu'un modérateur ne
 * les a pas relus (voir /admin/reviews).
 *
 * À la différence de l'accueil, qui ne montre que les avis de 4 et 5 étoiles
 * parce que c'est une vitrine, la fiche produit porte TOUTES les notes
 * publiées. Une page qui ne montrerait que des éloges ne se lit plus comme une
 * page d'avis, et la clientèle visée — qui redoute d'abord la contrefaçon — est
 * précisément celle qui vérifie.
 */

export interface KKReviewView {
  id: string;
  authorName: string;
  city?: string;
  rating: number;
  title: string;
  body: string;
  /** ISO 8601, formaté à l'affichage selon la langue de la page. */
  createdAt: string;
}

export interface KKProductReviews {
  items: KKReviewView[];
  count: number;
  /** Moyenne sur 5, arrondie au dixième. 0 si aucun avis publié. */
  average: number;
  /** Nombre d'avis par note, de 1 à 5 étoiles — index 0 = 1 étoile. */
  distribution: [number, number, number, number, number];
}

export async function getProductReviews(
  productId: string,
  limit = 20,
): Promise<KKProductReviews> {
  const rows = await prisma.review.findMany({
    where: { productId, status: "approved" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      authorName: true,
      city: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
    },
  });

  // La moyenne et la répartition sont calculées sur TOUS les avis publiés, pas
  // sur la page affichée : sinon « 4,6 sur 5 » ne porterait que sur les vingt
  // derniers et changerait au fil des publications.
  const notes = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId, status: "approved" },
    _count: { rating: true },
  });

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let total = 0;
  let somme = 0;

  for (const note of notes) {
    const index = Math.min(5, Math.max(1, note.rating)) - 1;
    const n = note._count.rating;
    distribution[index] += n;
    total += n;
    somme += note.rating * n;
  }

  return {
    items: rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      city: r.city ?? undefined,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
    count: total,
    average: total > 0 ? Math.round((somme / total) * 10) / 10 : 0,
    distribution,
  };
}
