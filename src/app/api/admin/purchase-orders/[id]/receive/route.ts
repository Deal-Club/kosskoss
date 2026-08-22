import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { recevoirLignes, type ReceptionLigneInput } from "@/server/kk/bons";
import { adminActorLabel } from "@/server/admins";

type Params = { params: Promise<{ id: string }> };

interface ReceiveBody {
  receptions?: ReceptionLigneInput[];
  majCoutProduit?: boolean;
  note?: string;
}

export async function POST(request: Request, { params }: Params) {
  const { session, unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as ReceiveBody | null;
  if (!body || !Array.isArray(body.receptions) || body.receptions.length === 0) {
    return NextResponse.json({ error: "Aucune ligne à recevoir." }, { status: 400 });
  }
  // Champ exigé, sans défaut : cette case écrase le coût d'achat du produit
  // dans tout le catalogue. Un appelant qui l'omet ne doit jamais l'écraser
  // par accident — l'écran l'envoie toujours (coché par défaut à l'écran,
  // pas dans l'API).
  if (typeof body.majCoutProduit !== "boolean") {
    return NextResponse.json(
      { error: "Le champ majCoutProduit (booléen) est obligatoire." },
      { status: 400 },
    );
  }

  const par = await adminActorLabel(session);

  try {
    const resultat = await recevoirLignes(id, body.receptions, {
      majCoutProduit: body.majCoutProduit,
      note: body.note,
      par,
    });
    return NextResponse.json(resultat);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Réception impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
