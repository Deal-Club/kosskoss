import { prisma } from "@/server/prisma";
import type { ReviewRecord, ReviewStatus } from "@/server/types";

// Les avis en attente sont toujours remontés en premier dans les listes mixtes :
// c'est la file de travail du modérateur.
const STATUS_ORDER: Record<ReviewStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

const reviewInclude = {
  product: { select: { brand: true, name: true } },
} as const;

interface ReviewRow {
  id: string;
  productId: string;
  authorName: string;
  authorEmail: string | null;
  city: string | null;
  rating: number;
  title: string;
  body: string;
  status: string;
  moderatorNote: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  product?: { brand: string; name: string } | null;
}

function toReviewRecord(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product ? `${row.product.brand} ${row.product.name}` : undefined,
    authorName: row.authorName,
    authorEmail: row.authorEmail ?? undefined,
    city: row.city ?? undefined,
    rating: row.rating,
    title: row.title,
    body: row.body,
    // Le statut est un String côté base : tout ce qui sort du trio connu est traité
    // comme "pending", donc jamais visible dans la boutique.
    status: isReviewStatus(row.status) ? row.status : "pending",
    moderatorNote: row.moderatorNote ?? undefined,
    createdAt: row.createdAt.toISOString(),
    moderatedAt: row.moderatedAt ? row.moderatedAt.toISOString() : undefined,
  };
}

export interface ReviewFilter {
  status?: ReviewStatus;
  productId?: string;
}

export async function listReviews(filter?: ReviewFilter): Promise<ReviewRecord[]> {
  const rows = await prisma.review.findMany({
    where: {
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.productId ? { productId: filter.productId } : {}),
    },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });

  // Le tri est stable : à statut égal, l'ordre antéchronologique est conservé.
  return rows
    .map(toReviewRecord)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export interface ReviewStatusCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export async function countReviewsByStatus(): Promise<ReviewStatusCounts> {
  const [pending, approved, rejected] = await Promise.all([
    prisma.review.count({ where: { status: "pending" } }),
    prisma.review.count({ where: { status: "approved" } }),
    prisma.review.count({ where: { status: "rejected" } }),
  ]);

  return { pending, approved, rejected, total: pending + approved + rejected };
}

export async function getReview(id: string): Promise<ReviewRecord | undefined> {
  const row = await prisma.review.findUnique({ where: { id }, include: reviewInclude });
  return row ? toReviewRecord(row) : undefined;
}

export interface CreateReviewInput {
  productId: string;
  authorName: string;
  authorEmail?: string;
  city?: string;
  rating: number;
  title?: string;
  body: string;
}

export async function createReview(input: CreateReviewInput): Promise<ReviewRecord> {
  const row = await prisma.review.create({
    data: {
      productId: input.productId,
      authorName: input.authorName,
      authorEmail: input.authorEmail ?? null,
      city: input.city ?? null,
      rating: input.rating,
      title: input.title ?? "",
      body: input.body,
      // Le statut est imposé ici et jamais repris de l'appelant : un visiteur ne
      // peut en aucun cas publier directement.
      status: "pending",
    },
    include: reviewInclude,
  });

  return toReviewRecord(row);
}

export async function moderateReview(
  id: string,
  status: ReviewStatus,
  moderatorEmail: string,
  note?: string,
): Promise<ReviewRecord | undefined> {
  const current = await prisma.review.findUnique({ where: { id } });
  if (!current) return undefined;

  const trimmedNote = note?.trim();
  const row = await prisma.review.update({
    where: { id },
    data: {
      status,
      moderatorNote: trimmedNote ? trimmedNote : null,
      moderatedAt: new Date(),
      moderatedBy: moderatorEmail,
    },
    include: reviewInclude,
  });

  return toReviewRecord(row);
}

export async function deleteReview(id: string): Promise<boolean> {
  const current = await prisma.review.findUnique({ where: { id } });
  if (!current) return false;

  await prisma.review.delete({ where: { id } });
  return true;
}

/** Contrôle d'existence léger utilisé par la route publique de dépôt d'avis. */
export async function productExists(productId: string): Promise<boolean> {
  const row = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  return row !== null;
}
