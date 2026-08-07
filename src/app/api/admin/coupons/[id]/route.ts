import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { deleteCoupon, updateCoupon, type CouponInput } from "@/server/coupons";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as CouponInput | null;
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    const coupon = await updateCoupon(id, body);
    if (!coupon) return NextResponse.json({ error: "Code introuvable." }, { status: 404 });
    return NextResponse.json(coupon);
  } catch (error) {
    const doublon =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (doublon) {
      return NextResponse.json({ error: "Ce code existe déjà." }, { status: 409 });
    }
    console.error("[coupons] Mise à jour impossible :", error);
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await deleteCoupon(id);
  return NextResponse.json({ ok: true });
}
