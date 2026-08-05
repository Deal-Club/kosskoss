import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import type { AdminSession } from "@/lib/adminAuth";

/**
 * Union discriminée volontaire : après `if (unauthorized) return unauthorized;`
 * TypeScript sait que `session` est acquise. Sans ça, chaque route devait
 * retester la session ou l'affirmer non nulle.
 */
type AdminApiResult =
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
