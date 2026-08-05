"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/** Déconnexion : la session est fermée côté serveur, pas seulement dans l'onglet. */
export function AccountLogoutButton({ className }: { className?: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } catch {
      // Même si l'appel échoue, on renvoie le visiteur vers l'accueil : le
      // cookie sera de toute façon rejeté à la prochaine page protégée.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      aria-busy={pending}
      className={
        className ??
        "flex w-full items-center gap-2 rounded-sm border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      }
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      {pending ? t("nav.loggingOut") : t("nav.logout")}
    </button>
  );
}
