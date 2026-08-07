import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { deleteAnnouncement, updateAnnouncement } from "@/server/announcements";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const item = await updateAnnouncement(id, {
    ...(typeof body.message === "string" ? { message: body.message } : {}),
    ...(typeof body.icon === "string" ? { icon: body.icon } : {}),
    ...(typeof body.active === "boolean" ? { active: body.active } : {}),
  });
  if (!item) return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });

  revalidatePath("/", "layout");
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await deleteAnnouncement(id);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
