import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { createIntegration, listIntegrations } from "@/server/integrations";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  // listIntegrations liefert bewusst nur Maske und Status, nie den Klartext.
  const integrations = await listIntegrations();
  return NextResponse.json(integrations);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (typeof body?.key !== "string" || typeof body?.label !== "string") {
    return NextResponse.json(
      { error: "La clé et le libellé sont obligatoires." },
      { status: 400 },
    );
  }

  try {
    const integration = await createIntegration({
      key: body.key,
      label: body.label,
      description: typeof body.description === "string" ? body.description : undefined,
    });
    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
