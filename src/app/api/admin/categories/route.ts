import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/slugify";
import { createCategory, listCategories } from "@/server/store";
import type { CategoryGuide } from "@/server/types";

/** Nimmt nur Abschnitte mit Inhalt an und wirft alles Unbrauchbare weg. */
function parseGuide(raw: unknown): CategoryGuide {
  const source = (raw ?? {}) as {
    intro?: unknown;
    closing?: unknown;
    sections?: unknown;
  };
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

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const categories = await listCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const groupSlug = typeof body?.group === "string" ? body.group.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (!groupSlug) {
    return NextResponse.json({ error: "Veuillez choisir un univers produits." }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json(
      { error: "Veuillez indiquer un libellé pour la catégorie." },
      { status: 400 },
    );
  }

  const slug = slugify(typeof body?.slug === "string" && body.slug.trim() ? body.slug : label);
  if (!slug) {
    return NextResponse.json(
      { error: "Impossible de construire un slug valide à partir de cette saisie." },
      { status: 400 },
    );
  }

  const group = await prisma.group.findUnique({ where: { slug: groupSlug } });
  if (!group) {
    return NextResponse.json(
      { error: `L'univers produits « ${groupSlug} » n'existe pas.` },
      { status: 400 },
    );
  }

  const conflict = await prisma.category.findFirst({
    where: { groupId: group.id, slug },
  });
  if (conflict) {
    return NextResponse.json(
      {
        error: `L'univers « ${group.label} » contient déjà la catégorie « ${conflict.label} » avec le slug « ${slug} ».`,
      },
      { status: 409 },
    );
  }

  try {
    const category = await createCategory({
      group: groupSlug,
      slug,
      label,
      description: typeof body?.description === "string" ? body.description : "",
      image: typeof body?.image === "string" ? body.image : "",
      guide: parseGuide(body?.guide),
    });
    revalidatePath("/", "layout");
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
