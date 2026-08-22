import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { enregistrerGestes } from "@/server/kk/gestes";
import type { GesteLigne } from "@/lib/kk/gestes-selection";

/**
 * Valide une entrée brute du corps de la requête et la convertit en
 * `GesteLigne`, ou renvoie `null` si elle est malformée.
 *
 * La clé n'est pas modifiable depuis l'écran, mais la route reste appelable
 * directement (curl, script) : elle doit donc revalider chaque champ elle-même
 * plutôt que de faire confiance à l'UI.
 */
function parseItem(raw: unknown): GesteLigne | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.key !== "string" || !r.key.trim()) return null;
  if (typeof r.labelFr !== "string" || !r.labelFr.trim()) return null;
  if (typeof r.labelEn !== "string") return null;
  if (typeof r.category !== "string" || !r.category.trim()) return null;
  // `Number.isInteger` et non `isFinite` : la colonne `position` est un `Int`.
  // Un 1.5 passerait la validation et n'échouerait qu'au fond de Prisma, en 500 nu.
  if (typeof r.position !== "number" || !Number.isInteger(r.position)) return null;
  if (typeof r.active !== "boolean") return null;

  return {
    // `key`, `labelFr` et `category` sont validées APRÈS `.trim()` : les
    // stocker brutes laisserait passer un `category: " hydratants "` qui, une
    // fois validé, ne correspondrait plus jamais à une catégorie produit — le
    // geste disparaîtrait de toute routine sans qu'aucune erreur ne le signale.
    key: r.key.trim(),
    labelFr: r.labelFr.trim(),
    labelEn: r.labelEn.trim(),
    category: r.category.trim(),
    position: r.position,
    active: r.active,
  };
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("reglages");
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

  const items: GesteLigne[] = [];
  for (const raw of body.items) {
    const item = parseItem(raw);
    if (!item) {
      return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
    }
    items.push(item);
  }

  await enregistrerGestes(items);
  return NextResponse.json({ ok: true });
}
