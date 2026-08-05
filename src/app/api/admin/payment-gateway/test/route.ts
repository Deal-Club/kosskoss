import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { adminActorLabel } from "@/server/admins";
import { setIntegrationSecret } from "@/server/integrations";
import { ensureGatewayIntegrations, getGateway, isGatewayId } from "@/server/gateways";

// Test de connexion à un prestataire de paiement depuis le back-office.
//
// Enregistre d'abord les clés fraîchement saisies (mêmes règles que la route de
// configuration : une valeur vide ne remplace jamais une clé existante), puis
// interroge le prestataire en lecture seule. Rien n'est encaissé, aucun secret
// n'est renvoyé — seulement de quoi corriger la configuration.

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    secrets?: unknown;
  } | null;

  if (!body || !isGatewayId(body.provider)) {
    return NextResponse.json({ error: "Prestataire inconnu." }, { status: 400 });
  }

  const gateway = getGateway(body.provider);
  if (typeof gateway.verifyConnection !== "function") {
    return NextResponse.json(
      { error: `${gateway.meta.label} ne propose pas de test de connexion.` },
      { status: 400 },
    );
  }

  await ensureGatewayIntegrations();

  const secrets =
    body.secrets && typeof body.secrets === "object"
      ? (body.secrets as Record<string, unknown>)
      : {};
  const actor = await adminActorLabel(session);
  for (const [key, value] of Object.entries(secrets)) {
    if (typeof value === "string" && value.trim()) {
      try {
        await setIntegrationSecret(key, value.trim(), actor);
      } catch {
        // Clé inconnue : ignorée, comme à l'enregistrement.
      }
    }
  }

  try {
    const check = await gateway.verifyConnection();
    return NextResponse.json(check);
  } catch (error) {
    // Panne réseau ou réponse inattendue du prestataire : la trace reste côté
    // serveur, l'administrateur reçoit un message exploitable.
    console.error(`[gateway:${body.provider}] test de connexion impossible:`, error);
    return NextResponse.json(
      {
        ok: false,
        summary: `Impossible de joindre ${gateway.meta.label}.`,
        issues: [error instanceof Error ? error.message : "Erreur inconnue."],
        details: [],
      },
      { status: 200 },
    );
  }
}
