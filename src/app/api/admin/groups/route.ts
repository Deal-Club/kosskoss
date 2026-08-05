import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const groups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { categories: true } } },
  });

  return NextResponse.json(
    groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      label: group.label,
      position: group.position,
      categoryCount: group._count.categories,
    })),
  );
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json(
      { error: "Veuillez indiquer un libellé pour l'univers produits." },
      { status: 400 },
    );
  }

  // Sans slug propre, il est dérivé du libellé (« Bûches feuillus » -> « buches-feuillus »).
  const rawSlug = typeof body?.slug === "string" && body.slug.trim() ? body.slug : label;
  const slug = slugify(rawSlug);
  if (!slug) {
    return NextResponse.json(
      { error: "Impossible de construire un slug valide à partir de cette saisie." },
      { status: 400 },
    );
  }

  const existing = await prisma.group.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `Le slug « ${slug} » est déjà utilisé par l'univers « ${existing.label} ».` },
      { status: 409 },
    );
  }

  const position =
    typeof body?.position === "number" && Number.isFinite(body.position)
      ? Math.trunc(body.position)
      : await prisma.group.count();

  const group = await prisma.group.create({ data: { slug, label, position } });
  revalidatePath("/", "layout");

  return NextResponse.json(
    {
      id: group.id,
      slug: group.slug,
      label: group.label,
      position: group.position,
      categoryCount: 0,
    },
    { status: 201 },
  );
}
