import { after, NextResponse } from "next/server";
import { buildRoutine } from "@/server/kk/diagnostic";
import { getCurrentCustomer } from "@/server/customerSession";
import { enregistrerProfil } from "@/server/kk/profil-diagnostic";

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
  // Le corps vient du navigateur : on n'accepte que les deux langues connues,
  // jamais une chaîne arbitraire transmise telle quelle à buildRoutine.
  const locale = body.locale === "en" ? "en" : "fr";
  const result = await buildRoutine(answers, locale);

  // Rattachement au compte, comme dans /api/checkout : lu dans le cookie
  // signé, jamais dans la charge utile. Un visiteur sans session ne déclenche
  // aucune écriture.
  const customer = await getCurrentCustomer();
  if (customer) {
    // Différé avec `after` : le résultat part au client tout de suite, la
    // sauvegarde du profil suit sans le retarder. `enregistrerProfil` ne
    // lève jamais.
    after(() => enregistrerProfil(customer.id, answers));
  }

  return NextResponse.json(result);
}
