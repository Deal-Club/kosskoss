import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { normalizeCodeSnippet } from "@/server/codeSnippetInput";
import { createSnippet, listSnippets } from "@/server/codeSnippets";

/**
 * Fragments de code de la boutique.
 *
 *   GET  …/scripts   liste complète, actifs et inactifs
 *   POST …/scripts   crée un fragment
 *
 * Le contrôle du contenu est refait ici : le formulaire du back-office n'est
 * qu'une commodité, il ne fait pas autorité.
 */

/**
 * Rafraîchit la boutique.
 * Le passage par la racine est nécessaire : les fragments sont injectés dans le
 * layout, donc présents sur toutes les pages.
 */
function refreshShop() {
  revalidatePath("/", "layout");
}

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ snippets: await listSnippets() });
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body: unknown = await request.json().catch(() => null);
  const result = normalizeCodeSnippet(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const snippet = await createSnippet(result.snippet, session.email);
  refreshShop();

  return NextResponse.json({ snippet }, { status: 201 });
}
