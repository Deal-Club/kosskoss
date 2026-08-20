"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { IconActionButton } from "@/components/admin/IconAction";

export function DeleteButton({ action, confirmLabel }: { action: string; confirmLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmLabel)) return;
    setPending(true);
    const response = await fetch(action, { method: "DELETE" });
    setPending(false);
    if (response.ok) {
      router.refresh();
      return;
    }
    // Le refus a souvent une raison que seul le serveur connaît — une commande
    // déjà facturée, par exemple, répond 409 avec un motif rédigé. L'écraser
    // par un message générique la rendrait indéchiffrable pour l'opérateur.
    const motif = await response
      .json()
      .then((corps: unknown) =>
        typeof corps === "object" && corps !== null && typeof (corps as { error?: unknown }).error === "string"
          ? ((corps as { error: string }).error)
          : "",
      )
      .catch(() => "");
    window.alert(motif.trim() || "Échec de la suppression.");
  }

  return (
    <IconActionButton
      label="Supprimer"
      icon={Trash2}
      tone="danger"
      onClick={handleDelete}
      disabled={pending}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </IconActionButton>
  );
}
