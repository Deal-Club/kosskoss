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
    } else {
      window.alert("Échec de la suppression.");
    }
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
