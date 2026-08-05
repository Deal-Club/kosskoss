import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { launchCampaign } from "@/server/campaigns";
import {
  campaignErrorMessage,
  campaignErrorStatus,
  isCampaignError,
} from "@/server/campaignInput";

type Params = Promise<{ id: string }>;

/**
 * Lancement de l'envoi.
 *
 * Le corps porte la liste exacte des adresses retenues dans l'assistant, pas un
 * filtre : la sélection est faite à l'écran, elle ne doit pas pouvoir bouger
 * entre l'affichage et le clic. `launchCampaign()` écarte ensuite les
 * désinscrits et les doublons, et renvoie le compte réellement mis en file.
 */
export async function POST(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rawEmails = body?.emails;

  if (!Array.isArray(rawEmails)) {
    return NextResponse.json(
      { error: "La liste des destinataires est obligatoire." },
      { status: 400 },
    );
  }

  const emails = rawEmails.filter((entry): entry is string => typeof entry === "string");
  if (emails.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins un destinataire." }, { status: 400 });
  }

  try {
    const result = await launchCampaign(id, emails);
    // La campagne passe en « en_cours » : sa remise s'applique désormais sur la
    // boutique, les pages produit doivent être reconstruites.
    revalidatePath("/", "layout");
    return NextResponse.json(result);
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
