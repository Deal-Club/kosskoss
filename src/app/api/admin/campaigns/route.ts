import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { createCampaign, listCampaigns } from "@/server/campaigns";
import { adminActorLabel } from "@/server/admins";
import {
  campaignErrorMessage,
  campaignErrorStatus,
  isCampaignError,
  parseCampaignInput,
} from "@/server/campaignInput";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const campaigns = await listCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { values, error } = parseCampaignInput(body, await adminActorLabel(session));
  if (!values) return NextResponse.json({ error }, { status: 400 });

  try {
    const campaign = await createCampaign(values);
    // La campagne naît en brouillon et ne remise donc encore rien, mais la
    // boutique lit les promotions à chaque rendu : on rafraîchit tout de suite
    // pour que rien ne dépende de la date d'expiration d'un cache.
    revalidatePath("/", "layout");
    return NextResponse.json(campaign, { status: 201 });
  } catch (caught) {
    if (isCampaignError(caught)) {
      return NextResponse.json(
        { error: campaignErrorMessage(caught), code: caught.code },
        { status: campaignErrorStatus(caught) },
      );
    }
    throw caught;
  }
}
