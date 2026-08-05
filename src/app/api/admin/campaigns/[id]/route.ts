import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { deleteCampaign, getCampaign, updateCampaign } from "@/server/campaigns";
import {
  campaignErrorMessage,
  campaignErrorStatus,
  isCampaignError,
  parseCampaignInput,
} from "@/server/campaignInput";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { values, error } = parseCampaignInput(body, session.email);
  if (!values) return NextResponse.json({ error }, { status: 400 });

  try {
    const campaign = await updateCampaign(id, values);
    if (!campaign) return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    revalidatePath("/", "layout");
    return NextResponse.json(campaign);
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

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const deleted = await deleteCampaign(id);
    if (!deleted) return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
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
