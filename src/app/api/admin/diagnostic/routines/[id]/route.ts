import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import {
  enregistrerRoutine,
  supprimerRoutine,
  parseRoutineBody,
  RoutineConflit,
} from "@/server/kk/routine-admin";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireCapaciteApi("reglages");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const input = parseRoutineBody(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    await enregistrerRoutine(id, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RoutineConflit) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[routine] enregistrement impossible", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireCapaciteApi("reglages");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    await supprimerRoutine(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[routine] suppression impossible", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
