import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { sendTestEmail } from "@/server/campaigns";
import {
  campaignErrorMessage,
  campaignErrorStatus,
  isCampaignError,
} from "@/server/campaignInput";

type Params = Promise<{ id: string }>;

/**
 * Envoi d'un message de test.
 *
 * L'adresse par défaut est celle de l'administrateur connecté : dans neuf cas
 * sur dix c'est là qu'on veut voir le message, et cela évite qu'un test parte
 * chez un client par inadvertance.
 */
export async function POST(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const raw = typeof body?.email === "string" ? body.email.trim() : "";
  const email = raw || session.email;

  try {
    await sendTestEmail(id, email);
    return NextResponse.json({ success: true, email });
  } catch (caught) {
    if (isCampaignError(caught)) {
      return NextResponse.json(
        { error: campaignErrorMessage(caught), code: caught.code },
        { status: campaignErrorStatus(caught) },
      );
    }

    // Un refus du fournisseur d'e-mail n'est pas une CampaignError : il remonte
    // tel quel, c'est le seul indice exploitable pour l'administrateur.
    const message = caught instanceof Error ? caught.message : "Échec de l'envoi de test.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
