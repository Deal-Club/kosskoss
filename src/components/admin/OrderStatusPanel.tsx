"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
} from "@/lib/orderStatus";
import type { OrderStatus, PaymentStatus } from "@/lib/orderStatus";

// Panneau de suivi du back-office : changement de statut de commande, de
// statut de paiement et note interne. Chaque envoi laisse une trace dans
// l'historique de la commande, côté serveur.

const SELECT =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";

export function OrderStatusPanel({
  orderId,
  status,
  paymentStatus,
  adminNote,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  adminNote: string;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [nextPaymentStatus, setNextPaymentStatus] = useState<PaymentStatus>(paymentStatus);
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState(adminNote);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    nextStatus !== status || nextPaymentStatus !== paymentStatus || internalNote !== adminNote;

  async function save() {
    setError(null);
    setSaved(false);
    setPending(true);

    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(nextStatus !== status ? { status: nextStatus } : {}),
        ...(nextPaymentStatus !== paymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
        ...(internalNote !== adminNote ? { adminNote: internalNote } : {}),
        note: note.trim() || undefined,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "La commande n'a pas pu être mise à jour.");
      return;
    }

    setNote("");
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="rounded-sm border border-border bg-white p-5">
      <h2 className="mb-4 text-lg font-black text-foreground">Modifier le statut</h2>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Statut de la commande</span>
        <select
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
          className={SELECT}
        >
          {ORDER_STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {ORDER_STATUS_LABELS[entry].fr}
            </option>
          ))}
        </select>
      </label>

      {nextStatus === "storniert" && status !== "storniert" && (
        <p className="mb-4 rounded-sm border border-accent bg-accent/15 px-3 py-2 text-xs font-semibold text-foreground">
          En cas d&apos;annulation, la marchandise est automatiquement recréditée au stock.
        </p>
      )}

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Statut de paiement</span>
        <select
          value={nextPaymentStatus}
          onChange={(event) => setNextPaymentStatus(event.target.value as PaymentStatus)}
          className={SELECT}
        >
          {PAYMENT_STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {PAYMENT_STATUS_LABELS[entry].fr}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">
          Commentaire sur la modification (facultatif)
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          placeholder="ex. numéro de suivi ou motif de l'annulation"
          className={SELECT}
        />
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Note interne</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={internalNote}
          onChange={(event) => setInternalNote(event.target.value)}
          placeholder="Visible uniquement dans le back-office."
          className={SELECT}
        />
      </label>

      {error && (
        <p role="alert" className="mb-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      {saved && !dirty && (
        <p role="status" className="mb-3 text-sm font-semibold text-[#16a34a]">
          Modifications enregistrées.
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enregistrer
      </button>
    </div>
  );
}
