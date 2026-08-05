import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import {
  createPaymentMethod,
  listPaymentMethods,
  reorderPaymentMethods,
} from "@/server/payments";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const methods = await listPaymentMethods();
  return NextResponse.json(methods);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Le même endpoint accepte un réordonnancement complet : { ids: [...] }.
  if (Array.isArray(body.ids)) {
    const methods = await reorderPaymentMethods(body.ids.map(String));
    revalidatePath("/", "layout");
    return NextResponse.json(methods);
  }

  if (typeof body.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "Le nom du moyen de paiement est obligatoire." }, { status: 400 });
  }

  try {
    const method = await createPaymentMethod({
      key: typeof body.key === "string" ? body.key : undefined,
      label: body.label,
      description: typeof body.description === "string" ? body.description : undefined,
      icon: typeof body.icon === "string" ? body.icon : undefined,
      feeLabel: typeof body.feeLabel === "string" ? body.feeLabel : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(method, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
