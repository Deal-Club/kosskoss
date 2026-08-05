import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";
import { deleteCategory, getCategoryRecord, updateCategory } from "@/server/store";
import type { CategoryGuide } from "@/server/types";

type Params = Promise<{ id: string[] }>;

/** Nimmt nur Abschnitte mit Inhalt an und wirft alles Unbrauchbare weg. */
function parseGuide(raw: unknown): CategoryGuide {
  const source = (raw ?? {}) as { intro?: unknown; closing?: unknown; sections?: unknown };
  const sections = Array.isArray(source.sections) ? source.sections : [];

  return {
    intro: typeof source.intro === "string" ? source.intro : "",
    closing: typeof source.closing === "string" ? source.closing : "",
    sections: sections
      .map((section) => {
        const entry = (section ?? {}) as { heading?: unknown; body?: unknown };
        return {
          heading: typeof entry.heading === "string" ? entry.heading : "",
          body: typeof entry.body === "string" ? entry.body : "",
        };
      })
      .filter((section) => section.heading.trim() || section.body.trim()),
  };
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const category = await getCategoryRecord(id.join("/"));
  if (!category) {
    return NextResponse.json({ error: "Cette catégorie n'existe pas." }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const categoryId = id.join("/");
  const [groupSlug, categorySlug] = id;

  const current = await prisma.category.findFirst({
    where: { slug: categorySlug, group: { slug: groupSlug } },
    include: { group: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Cette catégorie n'existe pas." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : current.label;
  if (!label) {
    return NextResponse.json(
      { error: "Veuillez indiquer un libellé pour la catégorie." },
      { status: 400 },
    );
  }

  const targetGroupSlug =
    typeof body.group === "string" && body.group.trim() ? body.group.trim() : current.group.slug;
  const targetGroup =
    targetGroupSlug === current.group.slug
      ? current.group
      : await prisma.group.findUnique({ where: { slug: targetGroupSlug } });
  if (!targetGroup) {
    return NextResponse.json(
      { error: `L'univers produits « ${targetGroupSlug} » n'existe pas.` },
      { status: 400 },
    );
  }

  const targetSlug =
    typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : current.slug;
  if (!targetSlug) {
    return NextResponse.json(
      { error: "Impossible de construire un slug valide à partir de cette saisie." },
      { status: 400 },
    );
  }

  // Ne contrôler que si l'univers ou le slug changent réellement.
  if (targetGroup.id !== current.groupId || targetSlug !== current.slug) {
    const conflict = await prisma.category.findFirst({
      where: { groupId: targetGroup.id, slug: targetSlug, NOT: { id: current.id } },
    });
    if (conflict) {
      return NextResponse.json(
        {
          error: `In der Warenwelt „${targetGroup.label}“ gibt es bereits die Kategorie „${conflict.label}“ mit dem Slug „${targetSlug}“.`,
        },
        { status: 409 },
      );
    }
  }

  const updated = await updateCategory(categoryId, {
    group: targetGroup.slug,
    slug: targetSlug,
    label,
    description: typeof body.description === "string" ? body.description : undefined,
    image: typeof body.image === "string" ? body.image : undefined,
    guide: body.guide === undefined ? undefined : parseGuide(body.guide),
  });
  if (!updated) {
    return NextResponse.json({ error: "Cette catégorie n'existe pas." }, { status: 404 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const deleted = await deleteCategory(id.join("/"));
  if (!deleted) {
    return NextResponse.json({ error: "Cette catégorie n'existe pas." }, { status: 404 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
