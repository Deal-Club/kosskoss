import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { deleteReview, moderateReview } from "@/server/reviews";
import { adminActorLabel } from "@/server/admins";

type Params = Promise<{ id: string }>;

const MAX_NOTE_LENGTH = 500;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  // Un modérateur ne fait que publier ou refuser : le retour à "pending" n'est pas
  // exposé, cela n'aurait pas de sens après une décision.
  const status = payload.status;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json(
      { error: 'Status muss "approved" oder "rejected" sein.' },
      { status: 400 },
    );
  }

  const note = typeof payload.moderatorNote === "string" ? payload.moderatorNote.trim() : "";
  if (note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `La note de modération ne doit pas dépasser ${MAX_NOTE_LENGTH} caractères.` },
      { status: 400 },
    );
  }

  // Un superadmin modère sous « System », pas sous son adresse.
  const review = await moderateReview(id, status, await adminActorLabel(session), note || undefined);
  if (!review) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  revalidatePath("/", "layout");
  return NextResponse.json(review);
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const deleted = await deleteReview(id);
  if (!deleted) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
