"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash2, X } from "lucide-react";
import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import { IconActionButton } from "@/components/admin/IconAction";
import type { PaymentMethodRecord } from "@/server/types";

interface PaymentMethodTableProps {
  methods: PaymentMethodRecord[];
}

export function PaymentMethodTable({ methods }: PaymentMethodTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(id: string, init: RequestInit, fallback: string) {
    setPendingId(id);
    setError(null);
    const response = await fetch(`/api/admin/payment-methods/${id}`, init);
    setPendingId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? fallback);
      return;
    }
    router.refresh();
  }

  function toggle(method: PaymentMethodRecord) {
    void send(
      method.id,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !method.enabled }),
      },
      "Le statut n'a pas pu être modifié.",
    );
  }

  function move(method: PaymentMethodRecord, direction: "up" | "down") {
    void send(
      method.id,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move: direction }),
      },
      "L'ordre n'a pas pu être modifié.",
    );
  }

  function remove(method: PaymentMethodRecord) {
    if (!window.confirm(`Supprimer définitivement le moyen de paiement « ${method.label} » ?`))
      return;
    void send(method.id, { method: "DELETE" }, "Échec de la suppression.");
  }

  if (methods.length === 0) {
    return (
      <p className="rounded-sm border border-border bg-white p-6 text-sm text-muted-foreground">
        Aucun moyen de paiement créé pour le moment.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-sm border border-destructive bg-white px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Ordre</th>
              <th className="px-4 py-3">Moyen de paiement</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Frais</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method, index) => (
              <Fragment key={method.id}>
                <tr className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 font-bold text-muted-foreground">{index + 1}</span>
                      <IconActionButton
                        label="Monter"
                        icon={ArrowUp}
                        onClick={() => move(method, "up")}
                        disabled={index === 0 || pendingId === method.id}
                      />
                      <IconActionButton
                        label="Descendre"
                        icon={ArrowDown}
                        onClick={() => move(method, "down")}
                        disabled={index === methods.length - 1 || pendingId === method.id}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-foreground">{method.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {method.key} · {method.icon}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">
                    {method.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{method.feeLabel || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={method.enabled}
                      onClick={() => toggle(method)}
                      disabled={pendingId === method.id}
                      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition disabled:opacity-50 ${
                        method.enabled ? "bg-primary" : "bg-border"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white transition ${
                          method.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                      {method.enabled ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <IconActionButton
                        label={editingId === method.id ? "Fermer" : "Modifier"}
                        icon={editingId === method.id ? X : Pencil}
                        onClick={() => setEditingId(editingId === method.id ? null : method.id)}
                      />
                      <IconActionButton
                        label="Supprimer"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => remove(method)}
                        disabled={pendingId === method.id}
                      />
                    </div>
                  </td>
                </tr>
                {editingId === method.id && (
                  <tr className="border-b border-border bg-muted">
                    <td colSpan={6} className="px-4 py-4">
                      <PaymentMethodForm
                        mode="edit"
                        initialData={method}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
