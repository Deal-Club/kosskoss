import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { adminActorLabel } from "@/server/admins";
import { setIntegrationSecret } from "@/server/integrations";
import {
  ensureGatewayIntegrations,
  getGateway,
  isGatewayId,
  saveGatewayConfig,
} from "@/server/gateways";

// Configuration du paiement en ligne depuis le back-office :
//   - choix du prestataire actif (ou aucun) ;
//   - saisie des clés secrètes (stockées chiffrées via la table Integration) ;
//   - choix des moyens de paiement encaissés en ligne via ce prestataire.
//
// Une clé n'est écrite que si elle est réellement fournie : laisser un champ
// vide conserve la clé déjà enregistrée. Le clair n'est jamais renvoyé.

export async function PUT(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    methodKeys?: unknown;
    secrets?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  // Prestataire : une des valeurs connues, ou null pour désactiver.
  const provider =
    body.provider === null || body.provider === "" || body.provider === undefined
      ? null
      : isGatewayId(body.provider)
        ? body.provider
        : undefined;
  if (provider === undefined) {
    return NextResponse.json({ error: "Prestataire inconnu." }, { status: 400 });
  }

  const methodKeys = Array.isArray(body.methodKeys)
    ? body.methodKeys.filter((entry): entry is string => typeof entry === "string")
    : [];

  // Refuse d'activer un prestataire non implémenté : mieux vaut un message clair
  // qu'une commande qui échoue au moment de payer.
  if (provider && !getGateway(provider).meta.implemented) {
    return NextResponse.json(
      {
        error:
          "Ce prestataire est pré-câblé mais son encaissement n'est pas encore branché. Choisissez Stripe pour activer le paiement en ligne.",
      },
      { status: 400 },
    );
  }

  await ensureGatewayIntegrations();

  // Enregistrement des clés fournies. Les valeurs vides sont ignorées : on ne
  // remplace jamais une clé existante par du vide.
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
        // Clé inconnue (ne correspond à aucune intégration) : on l'ignore
        // plutôt que d'échouer toute la sauvegarde.
      }
    }
  }

  const config = await saveGatewayConfig({ provider, methodKeys });
  return NextResponse.json({ ok: true, provider: config.provider, methodKeys: config.methodKeys });
}
