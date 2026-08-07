import { NextResponse } from "next/server";
import { createKossOrder, type CheckoutItemInput, type KKPaymentMethod } from "@/server/kk/checkout";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalide" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [];

  const result = await createKossOrder({
    items,
    fullName: String(body.fullName ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    location: String(body.location ?? ""),
    followOrder: Boolean(body.followOrder),
    paymentMethod: body.paymentMethod as KKPaymentMethod,
    locale: String(body.locale ?? "fr"),
    // Seul le code transite ; le montant de la remise est recalculé en base.
    couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
