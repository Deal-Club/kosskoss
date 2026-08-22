import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { ajouterLigne, type LigneBonInput } from "@/server/kk/bons";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Partial<LigneBonInput> | null;
  if (
    !body ||
    typeof body.productId !== "string" ||
    !body.productId ||
    typeof body.quantityOrdered !== "number" ||
    typeof body.unitCostCents !== "number"
  ) {
    return NextResponse.json(
      { error: "Produit, quantité commandée et coût unitaire sont obligatoires." },
      { status: 400 },
    );
  }

  try {
    const bon = await ajouterLigne(id, {
      productId: body.productId,
      quantityOrdered: body.quantityOrdered,
      unitCostCents: body.unitCostCents,
    });
    return NextResponse.json(bon, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ajout de la ligne impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
