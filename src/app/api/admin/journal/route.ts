import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { parseArticleInput } from "@/lib/journal/input";
import { listAdminArticles, saveArticle } from "@/server/journal/store";
import { revalidateJournal } from "@/server/journal/revalidate";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const articles = await listAdminArticles();
  return NextResponse.json(articles);
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = parseArticleInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const saved = await saveArticle(null, parsed.values, session.email);
    revalidateJournal(saved.slug);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
