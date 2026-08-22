import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { aLaCapacite } from "@/server/kk/acces";
import type { Capacite } from "@/lib/kk/roles";

export const getAdminSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/**
 * Garde des écrans d'administration : session ET droit.
 *
 * Un droit absent redirige vers un écran de refus, pas vers la connexion : une
 * redirection vers la connexion ferait croire à une session expirée, et
 * l'utilisateur se reconnecterait en boucle sans jamais comprendre.
 */
export async function requireCapacitePage(capacite: Capacite) {
  const session = await requireAdminSession();
  if (!(await aLaCapacite(capacite))) {
    redirect(`/admin/refuse?besoin=${capacite}`);
  }
  return session;
}
