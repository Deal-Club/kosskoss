import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import { modifierMarque, supprimerMarque } from "@/server/kk/marques";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  if (typeof body.name === "string" && !body.name.trim()) {
    return NextResponse.json({ error: "Le nom de la marque est obligatoire." }, { status: 400 });
  }

  try {
    const marque = await modifierMarque(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      nameEn: typeof body.nameEn === "string" ? body.nameEn : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      descriptionEn: typeof body.descriptionEn === "string" ? body.descriptionEn : undefined,
      logo: typeof body.logo === "string" ? body.logo : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
    });
    if (!marque) return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
    revalidatePath("/", "layout");
    return NextResponse.json(marque);
  } catch (error) {
    const doublon =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (doublon) {
      return NextResponse.json({ error: "Cette marque existe déjà." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[brands] Mise à jour impossible :", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const deleted = await supprimerMarque(id);
  if (!deleted) return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
