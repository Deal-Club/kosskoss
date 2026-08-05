import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import {
  deleteOrder,
  getOrder,
  isOrderStatus,
  isPaymentStatus,
  updateAdminNote,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/server/orders";
import { adminActorLabel } from "@/server/admins";

type Params = Promise<{ id: string }>;

const MAX_NOTE_LENGTH = 2000;

/**
 * Met à jour le statut de commande, le statut de paiement ou la note interne.
 * Les trois champs sont facultatifs et peuvent être combinés en un seul appel.
 */
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized || !session) {
    return unauthorized ?? NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `La note ne peut pas dépasser ${MAX_NOTE_LENGTH} caractères.` },
      { status: 400 },
    );
  }

  const hasStatus = payload.status !== undefined;
  const hasPaymentStatus = payload.paymentStatus !== undefined;
  const hasAdminNote = payload.adminNote !== undefined;

  if (!hasStatus && !hasPaymentStatus && !hasAdminNote) {
    return NextResponse.json(
      { error: "status, paymentStatus ou adminNote est obligatoire." },
      { status: 400 },
    );
  }

  if (hasStatus && !isOrderStatus(payload.status)) {
    return NextResponse.json({ error: "Statut de commande inconnu." }, { status: 400 });
  }
  if (hasPaymentStatus && !isPaymentStatus(payload.paymentStatus)) {
    return NextResponse.json({ error: "Statut de paiement inconnu." }, { status: 400 });
  }

  if (!(await getOrder(id))) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  // Un superadmin apparaît dans l'historique sous « System ».
  const actor = await adminActorLabel(session);

  if (hasStatus && isOrderStatus(payload.status)) {
    await updateOrderStatus(id, payload.status, actor, note);
  }
  if (hasPaymentStatus && isPaymentStatus(payload.paymentStatus)) {
    await updatePaymentStatus(id, payload.paymentStatus, actor, note);
  }
  if (hasAdminNote && typeof payload.adminNote === "string") {
    await updateAdminNote(id, payload.adminNote, actor);
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  // Une annulation remet la marchandise en stock : les pages boutique changent.
  revalidatePath("/", "layout");
  return NextResponse.json(order);
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(order);
}

/** Suppression définitive — utile pour retirer les commandes de test. */
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const deleted = await deleteOrder(id);
  if (!deleted) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
