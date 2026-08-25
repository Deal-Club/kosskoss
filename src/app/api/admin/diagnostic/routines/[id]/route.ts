import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { enregistrerRoutine } from "@/server/kk/routine-admin";

/**
 * Enregistre le nom et les gestes (produits ordonnés) d'une routine.
 *
 * Revalide chaque champ : la route reste appelable hors de l'écran (curl,
 * script), elle ne fait donc pas confiance à l'UI.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireCapaciteApi("reglages");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name : "";
  if (!Array.isArray(b.steps)) {
    return NextResponse.json({ error: "Liste des produits manquante." }, { status: 400 });
  }

  const steps: { productId: string; label: string }[] = [];
  for (const raw of b.steps) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const productId = typeof r.productId === "string" ? r.productId.trim() : "";
    const label = typeof r.label === "string" ? r.label : "";
    if (productId) steps.push({ productId, label });
  }

  try {
    await enregistrerRoutine(id, { name, steps });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[routine] enregistrement impossible", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}
