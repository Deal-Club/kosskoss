import { NextResponse } from "next/server";
import { buildRoutine } from "@/server/kk/diagnostic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "json_invalide" }, { status: 400 });
  }
  const answers = Array.isArray(body.answers)
    ? (body.answers as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const result = await buildRoutine(answers);
  return NextResponse.json(result);
}
