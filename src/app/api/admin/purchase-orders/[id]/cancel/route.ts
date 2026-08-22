import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { annulerBon } from "@/server/kk/bons";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const bon = await annulerBon(id);
    return NextResponse.json(bon);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Annulation impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
