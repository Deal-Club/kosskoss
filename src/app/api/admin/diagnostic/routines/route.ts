import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { creerRoutine, parseRoutineBody, RoutineConflit } from "@/server/kk/routine-admin";

/** Crée une routine et renvoie son identifiant. */
export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("reglages");
  if (unauthorized) return unauthorized;

  const input = parseRoutineBody(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    const id = await creerRoutine(input);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof RoutineConflit) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[routine] création impossible", error);
    return NextResponse.json({ error: "Création impossible." }, { status: 500 });
  }
}
