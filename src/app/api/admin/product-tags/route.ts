import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { saveProductTags } from "@/server/kk/product-tags";

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let body: { items?: unknown };
  try {
    body = (await request.json()) as { items?: unknown };
  } catch {
    return NextResponse.json({ error: "json_invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
  }

  await saveProductTags(body.items as { id: string; tagsText: string }[]);
  return NextResponse.json({ ok: true });
}
