import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { creerBon, listBons } from "@/server/kk/bons";
import type { StatutBon } from "@/lib/kk/approvisionnement";

const STATUTS: readonly StatutBon[] = ["brouillon", "envoye", "recu_partiel", "recu", "annule"];

function estStatut(valeur: string | null): valeur is StatutBon {
  return valeur !== null && (STATUTS as readonly string[]).includes(valeur);
}

export async function GET(request: Request) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const supplierId = url.searchParams.get("supplierId");

  const bons = await listBons({
    status: estStatut(status) ? status : undefined,
    supplierId: supplierId ?? undefined,
  });
  return NextResponse.json(bons);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as { supplierId?: string; note?: string } | null;
  if (!body || typeof body.supplierId !== "string" || !body.supplierId) {
    return NextResponse.json({ error: "Le fournisseur est obligatoire." }, { status: 400 });
  }

  try {
    const bon = await creerBon(body.supplierId, body.note ?? "");
    return NextResponse.json(bon, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[purchase-orders] Création impossible :", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
