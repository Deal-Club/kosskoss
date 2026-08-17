import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { parseArticleInput } from "@/lib/journal/input";
import { getAdminArticle, saveArticle, trashArticles } from "@/server/journal/store";
import { revalidateJournal } from "@/server/journal/revalidate";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const article = await getAdminArticle(id);
  if (!article) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  return NextResponse.json(article);
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = parseArticleInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const before = await getAdminArticle(id);
  if (!before) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

  try {
    const saved = await saveArticle(id, parsed.values, session.email);
    // L'ancienne adresse est invalidée elle aussi : sans ça, la page mise en
    // cache continuerait de répondre à la place de la redirection.
    revalidateJournal(saved.slug);
    if (saved.redirectFrom) revalidateJournal(saved.redirectFrom);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Mise à la corbeille. La suppression définitive passe par /bulk. */
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const article = await getAdminArticle(id);
  if (!article) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

  await trashArticles([id]);
  revalidateJournal(article.slug);
  return NextResponse.json({ success: true });
}
