import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import {
  clearIntegrationSecret,
  deleteIntegration,
  setIntegrationSecret,
  toggleIntegration,
} from "@/server/integrations";
import { adminActorLabel } from "@/server/admins";

type Params = Promise<{ key: string }>;

/** Enregistre un secret. Le texte en clair est accepté en entrée, jamais renvoyé. */
export async function PUT(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { key } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.value !== "string" || !body.value.trim()) {
    return NextResponse.json({ error: "La valeur ne peut pas être vide." }, { status: 400 });
  }

  try {
    const integration = await setIntegrationSecret(key, body.value, await adminActorLabel(session));
    if (!integration) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    return NextResponse.json(integration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { key } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Le champ \"enabled\" est obligatoire." }, { status: 400 });
  }

  try {
    const integration = await toggleIntegration(key, body.enabled);
    if (!integration) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    return NextResponse.json(integration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la mise à jour.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Par défaut, ne supprime que le secret enregistré.
 * Mit "?purge=1" wird der komplette Eintrag entfernt (eigene Integrationen).
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { key } = await params;
  const purge = new URL(request.url).searchParams.get("purge") === "1";

  if (purge) {
    const removed = await deleteIntegration(key);
    if (!removed) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  const integration = await clearIntegrationSecret(key);
  if (!integration) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }
  return NextResponse.json(integration);
}
