import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { createSupplier, listSuppliers, type SupplierInput } from "@/server/kk/fournisseurs";

export async function GET() {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  return NextResponse.json(await listSuppliers());
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as SupplierInput | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Le nom du fournisseur est obligatoire." }, { status: 400 });
  }

  try {
    return NextResponse.json(await createSupplier(body), { status: 201 });
  } catch (error) {
    // La contrainte d'unicité sur `name` est la seule erreur attendue ici.
    const doublon =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (doublon) {
      return NextResponse.json({ error: "Un fournisseur porte déjà ce nom." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[suppliers] Création impossible :", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
