import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { enregistrerVocabulaire, type ProductTagAdmin } from "@/server/kk/vocabulaire-tags";

// Note de nommage : le brief de la tâche demandait `/api/admin/product-tags`,
// mais cette route existe déjà pour un autre usage — associer des tags libres
// à un produit (voir src/app/api/admin/product-tags/route.ts et
// src/server/kk/product-tags.ts). La réutiliser aurait écrasé cette fonction.
// Le vocabulaire vit donc sous son propre chemin, aligné sur le nom du module
// serveur qui le porte (src/server/kk/vocabulaire-tags.ts).

/**
 * Valide une entrée brute du corps de la requête et la convertit en
 * `ProductTagAdmin`, ou renvoie `null` si elle est malformée.
 *
 * La clé n'est pas modifiable depuis l'écran, mais la route reste appelable
 * directement (curl, script) : elle doit donc revalider chaque champ elle-même
 * plutôt que de faire confiance à l'UI. `family` accepte n'importe quelle
 * chaîne non vide — seules « peau » et « preoccupation » deviennent des
 * facettes de catalogue, les autres familles restent éditables ici.
 */
function parseItem(raw: unknown): ProductTagAdmin | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.key !== "string" || !r.key.trim()) return null;
  if (typeof r.labelFr !== "string") return null;
  if (typeof r.labelEn !== "string") return null;
  if (typeof r.family !== "string" || !r.family.trim()) return null;
  // `Number.isInteger` et non `isFinite` : la colonne `position` est un `Int`.
  // Un 1.5 passait la validation et n'échouait qu'au fond de Prisma, en 500 nu.
  if (typeof r.position !== "number" || !Number.isInteger(r.position)) return null;
  if (typeof r.active !== "boolean") return null;

  return {
    // `key` et `family` sont validées APRÈS `.trim()` : les stocker brutes
    // laissait passer un `family: " peau "` qui, validé, ne correspondait plus
    // jamais à la famille des facettes — le tag disparaissait du catalogue sans
    // qu'aucune erreur ne le signale.
    key: r.key.trim(),
    labelFr: r.labelFr,
    labelEn: r.labelEn,
    family: r.family.trim(),
    position: r.position,
    active: r.active,
  };
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
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

  const items: ProductTagAdmin[] = [];
  for (const raw of body.items) {
    const item = parseItem(raw);
    if (!item) {
      return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
    }
    items.push(item);
  }

  await enregistrerVocabulaire(items);
  return NextResponse.json({ ok: true });
}
