import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import {
  deletePaymentMethod,
  getPaymentMethod,
  movePaymentMethod,
  updatePaymentMethod,
} from "@/server/payments";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    // Réordonnancement d'un cran : { move: "up" | "down" }.
    if (body.move === "up" || body.move === "down") {
      const methods = await movePaymentMethod(id, body.move);
      if (!methods) {
        return NextResponse.json({ error: "Introuvable." }, { status: 404 });
      }
      revalidatePath("/", "layout");
      return NextResponse.json(methods);
    }

    const updated = await updatePaymentMethod(id, {
      key: typeof body.key === "string" ? body.key : undefined,
      label: typeof body.label === "string" ? body.label : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      icon: typeof body.icon === "string" ? body.icon : undefined,
      feeLabel: typeof body.feeLabel === "string" ? body.feeLabel : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const existing = await getPaymentMethod(id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  await deletePaymentMethod(id);
  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
