import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import { creerMarque, listerMarques } from "@/server/kk/marques";

export async function GET() {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  return NextResponse.json(await listerMarques());
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Le nom de la marque est obligatoire." }, { status: 400 });
  }

  try {
    const marque = await creerMarque({
      name,
      nameEn: typeof body?.nameEn === "string" ? body.nameEn : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      descriptionEn: typeof body?.descriptionEn === "string" ? body.descriptionEn : undefined,
      logo: typeof body?.logo === "string" ? body.logo : undefined,
      position: typeof body?.position === "number" ? body.position : undefined,
      active: typeof body?.active === "boolean" ? body.active : undefined,
      slug: typeof body?.slug === "string" ? body.slug : undefined,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(marque, { status: 201 });
  } catch (error) {
    // La contrainte d'unicité sur `name` est la seule erreur attendue ici ;
    // le message reste explicite pour qui administre.
    const doublon =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (doublon) {
      return NextResponse.json({ error: "Cette marque existe déjà." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[brands] Création impossible :", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
