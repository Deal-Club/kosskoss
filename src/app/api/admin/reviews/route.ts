import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { countReviewsByStatus, isReviewStatus, listReviews } from "@/server/reviews";
import type { ReviewStatus } from "@/server/types";

export async function GET(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  let status: ReviewStatus | undefined;
  if (statusParam) {
    if (!isReviewStatus(statusParam)) {
      return NextResponse.json(
        { error: 'Unbekannter Status. Erlaubt sind "pending", "approved" und "rejected".' },
        { status: 400 },
      );
    }
    status = statusParam;
  }

  const productId = url.searchParams.get("productId") ?? undefined;

  const [reviews, counts] = await Promise.all([
    listReviews({ status, productId }),
    countReviewsByStatus(),
  ]);

  return NextResponse.json({ reviews, counts });
}
