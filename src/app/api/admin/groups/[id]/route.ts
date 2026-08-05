import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { categories: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "Cet univers produits n'existe pas." }, { status: 404 });
  }

  return NextResponse.json({
    id: group.id,
    slug: group.slug,
    label: group.label,
    position: group.position,
    categoryCount: group._count.categories,
  });
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const current = await prisma.group.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Cet univers produits n'existe pas." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : current.label;
  if (!label) {
    return NextResponse.json(
      { error: "Veuillez indiquer un libellé pour l'univers produits." },
      { status: 400 },
    );
  }

  const slug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : current.slug;
  if (!slug) {
    return NextResponse.json(
      { error: "Impossible de construire un slug valide à partir de cette saisie." },
      { status: 400 },
    );
  }

  if (slug !== current.slug) {
    const conflict = await prisma.group.findUnique({ where: { slug } });
    if (conflict) {
      return NextResponse.json(
        { error: `Le slug « ${slug} » est déjà utilisé par l'univers « ${conflict.label} ».` },
        { status: 409 },
      );
    }
  }

  const position =
    typeof body.position === "number" && Number.isFinite(body.position)
      ? Math.trunc(body.position)
      : current.position;

  const group = await prisma.group.update({
    where: { id },
    data: { label, slug, position },
    include: { _count: { select: { categories: true } } },
  });
  revalidatePath("/", "layout");

  return NextResponse.json({
    id: group.id,
    slug: group.slug,
    label: group.label,
    position: group.position,
    categoryCount: group._count.categories,
  });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { categories: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "Cet univers produits n'existe pas." }, { status: 404 });
  }

  // Supprimer un univers supprimerait ses catégories et donc tous les produits
  // per Cascade mitnehmen — deshalb wird das bewusst verweigert.
  if (group._count.categories > 0) {
    const count = group._count.categories;
    return NextResponse.json(
      {
        error:
          `L'univers « ${group.label} » contient encore ${count} ${count === 1 ? "catégorie" : "catégories"}. ` +
          "Déplacez-les ou supprimez-les d'abord.",
      },
      { status: 409 },
    );
  }

  await prisma.group.delete({ where: { id } });
  revalidatePath("/", "layout");

  return NextResponse.json({ success: true });
}
