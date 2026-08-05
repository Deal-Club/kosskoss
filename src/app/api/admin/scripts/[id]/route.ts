import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { normalizeCodeSnippet } from "@/server/codeSnippetInput";
import { deleteSnippet, updateSnippet } from "@/server/codeSnippets";

/**
 * Un fragment de code.
 *
 *   PUT    …/scripts/<id>   remplace le fragment
 *   DELETE …/scripts/<id>   le supprime
 */

type Params = Promise<{ id: string }>;

function refreshShop() {
  revalidatePath("/", "layout");
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const result = normalizeCodeSnippet(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const snippet = await updateSnippet(id, result.snippet, session.email);
  if (!snippet) {
    return NextResponse.json({ error: "Ce fragment n'existe plus." }, { status: 404 });
  }

  refreshShop();
  return NextResponse.json({ snippet });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!(await deleteSnippet(id))) {
    return NextResponse.json({ error: "Ce fragment n'existe plus." }, { status: 404 });
  }

  refreshShop();
  return NextResponse.json({ success: true });
}
