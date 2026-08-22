import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { retirerLigne } from "@/server/kk/bons";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id, lineId } = await params;
  try {
    const bon = await retirerLigne(id, lineId);
    return NextResponse.json(bon);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retrait de la ligne impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
