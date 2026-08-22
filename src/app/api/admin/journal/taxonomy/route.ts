/**
 * Catégories, tags et auteurs du Journal — création et modification.
 *
 * Une seule route pour les trois : ce sont trois formulaires très courts, gérés
 * depuis le même écran, et trois paires de fichiers quasi identiques auraient
 * surtout multiplié les endroits où oublier `requireAdminApi`. Le type visé est
 * porté par le corps de la requête, jamais par l'URL.
 */

import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import {
  deleteAuthor,
  deleteCategory,
  deleteTag,
  listAuthors,
  listCategories,
  listTags,
  saveAuthor,
  saveCategory,
  saveTag,
} from "@/server/journal/taxonomy";
import {
  parseAuthorInput,
  parseCategoryInput,
  parseTagInput,
} from "@/server/journal/taxonomyInput";
import { revalidateJournalTaxonomy } from "@/server/journal/revalidate";

const KINDS = ["category", "tag", "author"] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

export async function GET() {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const [categories, tags, authors] = await Promise.all([listCategories(), listTags(), listAuthors()]);
  return NextResponse.json({ categories, tags, authors });
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    id?: unknown;
    values?: unknown;
  } | null;

  if (!isKind(body?.kind)) {
    return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id.length > 0 ? body.id : null;

  try {
    if (body.kind === "category") {
      const parsed = parseCategoryInput(body.values);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      const savedId = await saveCategory(id, parsed.values);
      revalidateJournalTaxonomy();
      return NextResponse.json({ id: savedId }, { status: id ? 200 : 201 });
    }

    if (body.kind === "tag") {
      const parsed = parseTagInput(body.values);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      const savedId = await saveTag(id, parsed.values.label, parsed.values.labelEn);
      revalidateJournalTaxonomy();
      return NextResponse.json({ id: savedId }, { status: id ? 200 : 201 });
    }

    const parsed = parseAuthorInput(body.values);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const savedId = await saveAuthor(id, parsed.values);
    revalidateJournalTaxonomy();
    return NextResponse.json({ id: savedId }, { status: id ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";

  if (!isKind(kind) || !id) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    // Les articles ne sont jamais emportés : la relation est en `SetNull`.
    if (kind === "category") await deleteCategory(id);
    else if (kind === "tag") await deleteTag(id);
    else await deleteAuthor(id);

    revalidateJournalTaxonomy();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
