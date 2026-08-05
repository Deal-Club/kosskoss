"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-sm bg-white/10 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/20"
    >
      Déconnexion
    </button>
  );
}
