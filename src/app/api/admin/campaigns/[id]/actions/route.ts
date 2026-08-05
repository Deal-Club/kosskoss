import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import {
  cancelCampaign,
  pauseCampaign,
  resumeCampaign,
  retryFailedRecipients,
} from "@/server/campaigns";
import { dispatchCampaign } from "@/server/campaignDispatcher";
import {
  campaignErrorMessage,
  campaignErrorStatus,
  isCampaignError,
} from "@/server/campaignInput";

type Params = Promise<{ id: string }>;

const ACTIONS = ["pause", "resume", "cancel", "retry", "dispatch"] as const;
type CampaignAction = (typeof ACTIONS)[number];

function isAction(value: unknown): value is CampaignAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

/**
 * Pilotage d'un envoi en cours.
 *
 * Les cinq actions passent par la même route parce qu'elles portent toutes sur
 * l'état de l'envoi et se lisent au même endroit du tableau de bord. « dispatch »
 * force un lot immédiatement, sans attendre la tâche planifiée : c'est le
 * bouton qu'on utilise pour vérifier qu'une campagne part réellement.
 */
export async function POST(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  if (!isAction(action)) {
    return NextResponse.json(
      { error: `Action inconnue. Valeurs acceptées : ${ACTIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      case "pause":
        await pauseCampaign(id);
        break;
      case "resume":
        await resumeCampaign(id);
        break;
      case "cancel":
        await cancelCampaign(id);
        break;
      case "retry": {
        const requeued = await retryFailedRecipients(id);
        revalidatePath("/", "layout");
        return NextResponse.json({ success: true, action, requeued });
      }
      case "dispatch": {
        const report = await dispatchCampaign(id);
        revalidatePath("/", "layout");
        // Un rapport absent n'est pas une erreur : la campagne n'était
        // simplement pas éligible, ou un autre passage tenait déjà le verrou.
        return NextResponse.json({ success: true, action, report: report ?? null });
      }
    }

    // Pause, reprise et annulation changent l'application de la remise sur la
    // boutique : les pages produit doivent être reconstruites.
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, action });
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
