import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { envoyerBon } from "@/server/kk/bons";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const bon = await envoyerBon(id);
    return NextResponse.json(bon);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
