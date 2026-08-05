import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { saveQuestionnaire, type AdminQuestion } from "@/server/kk/diagnostic-admin";

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let body: { questions?: unknown };
  try {
    body = (await request.json()) as { questions?: unknown };
  } catch {
    return NextResponse.json({ error: "json_invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.questions)) {
    return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
  }

  const questions = body.questions as AdminQuestion[];
  for (const q of questions) {
    if (typeof q?.title !== "string" || !Array.isArray(q?.answers)) {
      return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
    }
  }

  await saveQuestionnaire(questions);
  return NextResponse.json({ ok: true });
}
