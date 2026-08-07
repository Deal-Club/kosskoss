import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { createCoupon, listCoupons, type CouponInput } from "@/server/coupons";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await listCoupons());
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as CouponInput | null;
  if (!body || typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Le code est obligatoire." }, { status: 400 });
  }

  try {
    return NextResponse.json(await createCoupon(body), { status: 201 });
  } catch (error) {
    // La contrainte d'unicité sur `code` est la seule erreur attendue ici ;
    // le message reste explicite pour qui administre.
    const doublon =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (doublon) {
      return NextResponse.json({ error: "Ce code existe déjà." }, { status: 409 });
    }
    console.error("[coupons] Création impossible :", error);
    return NextResponse.json({ error: "Création impossible." }, { status: 500 });
  }
}
