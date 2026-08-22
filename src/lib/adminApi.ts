import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { aLaCapacite } from "@/server/kk/acces";
import type { AdminSession } from "@/lib/adminAuth";
import type { Capacite } from "@/lib/kk/roles";

/**
 * Union discriminée volontaire : après `if (unauthorized) return unauthorized;`
 * TypeScript sait que `session` est acquise. Sans ça, chaque route devait
 * retester la session ou l'affirmer non nulle.
 */
export type AdminApiResult =
  | { session: AdminSession; unauthorized: null }
  | { session: null; unauthorized: NextResponse };

export async function requireAdminApi(): Promise<AdminApiResult> {
  const session = await getAdminSession();
  if (!session) {
    return {
      session: null,
      unauthorized: NextResponse.json({ error: "Non authentifié." }, { status: 401 }),
    };
  }
  return { session, unauthorized: null };
}

/**
 * Garde des routes d'administration : session ET droit.
 *
 * Les deux refus sont distincts, et c'est délibéré. `401` veut dire « je ne
 * sais pas qui vous êtes » et fait reconnecter ; `403` veut dire « je sais qui
 * vous êtes, et vous n'avez pas ce droit ». Les confondre déconnecterait
 * l'utilisateur au lieu de l'informer, et lui ferait croire à un bogue.
 */
export async function requireCapaciteApi(capacite: Capacite): Promise<AdminApiResult> {
  const base = await requireAdminApi();
  if (base.unauthorized) return base;

  if (!(await aLaCapacite(capacite))) {
    return {
      session: null,
      unauthorized: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }
  return base;
}
