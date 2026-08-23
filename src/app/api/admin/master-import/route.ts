import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import { importerMaster } from "@/server/kk/master";

/**
 * Déclenche l'import du master client (fiches produits + routines) depuis le
 * back-office — sans corps de requête, un bouton comme celui des marques
 * (`src/app/api/admin/brands/import/route.ts`). Idempotent EN ACCÈS
 * SÉRIALISÉ : relancé, il ne crée rien de plus (voir `src/server/kk/master.ts`).
 * Le compte rendu est renvoyé intégralement — l'écran doit pouvoir nommer,
 * pas seulement compter (règle 2 des contraintes globales du lot).
 */
export async function POST() {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  try {
    const compteRendu = await importerMaster();
    revalidatePath("/", "layout");
    return NextResponse.json(compteRendu);
  } catch (error) {
    console.error("[master-import] Import impossible :", error);
    const message = error instanceof Error ? error.message : "Import impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
