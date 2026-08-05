import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { adjustStock, isStockReason, listStockMovements, setStock } from "@/server/stock";
import { adminActorLabel } from "@/server/admins";

export async function GET(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") ?? undefined;
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

  const movements = await listStockMovements({
    productId,
    limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
  });
  return NextResponse.json(movements);
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "productId est obligatoire." }, { status: 400 });
  }

  const reason = isStockReason(body?.reason) ? body.reason : "korrektur";
  const note = typeof body?.note === "string" ? body.note : undefined;
  // Un superadmin est journalisé sous « System », jamais sous son adresse.
  const createdBy = await adminActorLabel(session);

  // Entweder eine Differenz (delta) oder ein absoluter Zielbestand (stock)
  const hasDelta = body?.delta !== undefined && body.delta !== null && body.delta !== "";
  const hasAbsolute = body?.stock !== undefined && body.stock !== null && body.stock !== "";

  if (hasDelta === hasAbsolute) {
    return NextResponse.json(
      { error: "Indiquez soit delta, soit stock — pas les deux." },
      { status: 400 },
    );
  }

  const rawValue = hasDelta ? body?.delta : body?.stock;
  const value = typeof rawValue === "number" ? rawValue : Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(value)) {
    return NextResponse.json({ error: "La quantité doit être un nombre entier." }, { status: 400 });
  }

  try {
    const result = hasDelta
      ? await adjustStock(productId, value, reason, note, createdBy)
      : await setStock(productId, value, reason, createdBy, note);

    if (!result) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    // Les pages boutique affichent la disponibilité : on reconstruit après chaque mouvement
    revalidatePath("/", "layout");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement du mouvement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
