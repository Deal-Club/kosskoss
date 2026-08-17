/**
 * Actions groupées sur les articles.
 *
 * Une seule action est réservée : la suppression définitive, qui exige le rôle
 * `superadmin`. Toutes les autres sont réversibles — un article archivé se
 * republie, un article à la corbeille se restaure — et n'ont donc pas à être
 * bridées dans un back-office où chaque compte est déjà protégé par un second
 * facteur.
 */

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { isSuperadminSession } from "@/server/admins";
import {
  purgeArticles,
  restoreArticles,
  setArticlesStatus,
  trashArticles,
} from "@/server/journal/store";
import { revalidateJournal } from "@/server/journal/revalidate";

const ACTIONS = ["publish", "draft", "archive", "trash", "restore", "purge"] as const;
type BulkAction = (typeof ACTIONS)[number];

function isAction(value: unknown): value is BulkAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    ids?: unknown;
  } | null;

  if (!isAction(body?.action)) {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucun article sélectionné." }, { status: 400 });
  }

  if (body.action === "purge" && !(await isSuperadminSession(session))) {
    return NextResponse.json(
      { error: "La suppression définitive est réservée au compte principal." },
      { status: 403 },
    );
  }

  let count = 0;
  switch (body.action) {
    case "publish":
      count = await setArticlesStatus(ids, "published");
      break;
    case "draft":
      count = await setArticlesStatus(ids, "draft");
      break;
    case "archive":
      count = await setArticlesStatus(ids, "archived");
      break;
    case "trash":
      count = await trashArticles(ids);
      break;
    case "restore":
      count = await restoreArticles(ids);
      break;
    case "purge":
      count = await purgeArticles(ids);
      break;
  }

  revalidateJournal();
  return NextResponse.json({ success: true, count });
}
