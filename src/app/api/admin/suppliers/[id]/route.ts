import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { deleteSupplier, updateSupplier, type SupplierInput } from "@/server/kk/fournisseurs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as SupplierInput | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Le nom du fournisseur est obligatoire." }, { status: 400 });
  }

  try {
    const fournisseur = await updateSupplier(id, body);
    if (!fournisseur) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
    return NextResponse.json(fournisseur);
  } catch (error) {
    const doublon =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (doublon) {
      return NextResponse.json({ error: "Un fournisseur porte déjà ce nom." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[suppliers] Mise à jour impossible :", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const deleted = await deleteSupplier(id);
    if (!deleted) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // deleteSupplier refuse avec un message qui dit combien de bons s'y
    // opposent : un refus qui ne dit pas contre quoi on bute est un refus
    // qu'on ne comprend pas.
    const message = error instanceof Error ? error.message : "Suppression impossible.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
