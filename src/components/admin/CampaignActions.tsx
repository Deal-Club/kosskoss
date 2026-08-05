"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Pause, Play, RotateCcw, Zap } from "lucide-react";
import type { CampaignStatus } from "@/lib/campaigns";

type Action = "pause" | "resume" | "cancel" | "retry" | "dispatch";

interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
  /** Destinataires en échec : le bouton de reprise n'a de sens qu'au-delà de zéro. */
  failedCount: number;
  pendingCount: number;
}

/**
 * Pilotage d'un envoi depuis le tableau de bord.
 *
 * Seule l'annulation demande une confirmation : les destinataires encore en
 * file passent définitivement en « ignoré », il n'y a pas de retour en arrière.
 * La pause, elle, se défait d'un clic.
 */
export function CampaignActions({
  campaignId,
  status,
  failedCount,
  pendingCount,
}: CampaignActionsProps) {
  const router = useRouter();
  const [running, setRunning] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: Action, confirmLabel?: string) {
    if (confirmLabel && !window.confirm(confirmLabel)) return;

    setError(null);
    setNotice(null);
    setRunning(action);

    const response = await fetch(`/api/admin/campaigns/${campaignId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await response.json().catch(() => null)) as
      | { error?: string; requeued?: number; report?: { sent: number; failed: number } | null }
      | null;

    setRunning(null);

    if (!response.ok) {
      setError(data?.error ?? "L'action a échoué.");
      return;
    }

    if (action === "retry" && typeof data?.requeued === "number") {
      setNotice(
        data.requeued === 0
          ? "Aucun destinataire en échec à relancer."
          : `${data.requeued} destinataire(s) remis en file.`,
      );
    }
    if (action === "dispatch") {
      setNotice(
        data?.report
          ? `Lot traité : ${data.report.sent} envoi(s), ${data.report.failed} échec(s).`
          : "Aucun lot à traiter pour le moment.",
      );
    }

    router.refresh();
  }

  const buttonClass =
    "flex items-center gap-1.5 rounded-sm border border-border bg-white px-3.5 py-2 text-sm font-bold text-foreground transition-colors hover:border-primary disabled:opacity-40";

  function icon(action: Action, Fallback: typeof Pause) {
    return running === action ? (
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
    ) : (
      <Fallback className="h-4 w-4" aria-hidden />
    );
  }

  const busy = running !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "en_cours" && (
          <>
            <button
              type="button"
              onClick={() => void run("pause")}
              disabled={busy}
              className={buttonClass}
            >
              {icon("pause", Pause)}
              Mettre en pause
            </button>
            <button
              type="button"
              onClick={() => void run("dispatch")}
              disabled={busy || pendingCount === 0}
              className={buttonClass}
            >
              {icon("dispatch", Zap)}
              Forcer un lot
            </button>
          </>
        )}

        {status === "pausee" && (
          <button
            type="button"
            onClick={() => void run("resume")}
            disabled={busy}
            className={buttonClass}
          >
            {icon("resume", Play)}
            Reprendre l&apos;envoi
          </button>
        )}

        {failedCount > 0 && status !== "brouillon" && status !== "annulee" && (
          <button
            type="button"
            onClick={() => void run("retry")}
            disabled={busy}
            className={buttonClass}
          >
            {icon("retry", RotateCcw)}
            Relancer les {failedCount} échec{failedCount > 1 ? "s" : ""}
          </button>
        )}

        {(status === "en_cours" || status === "pausee") && (
          <button
            type="button"
            onClick={() =>
              void run(
                "cancel",
                `Annuler définitivement cette campagne ? ${pendingCount} destinataire(s) encore en file ne recevront rien.`,
              )
            }
            disabled={busy}
            className="flex items-center gap-1.5 rounded-sm border border-destructive bg-white px-3.5 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-40"
          >
            {icon("cancel", Ban)}
            Annuler la campagne
          </button>
        )}
      </div>

      {notice && <p className="text-sm font-semibold text-[#16a34a]">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
