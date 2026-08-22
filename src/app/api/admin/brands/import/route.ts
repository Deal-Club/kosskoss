import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import { importerMarquesDuCatalogue } from "@/server/kk/marques";

/**
 * Rattache les produits à leur marque, sans corps de requête : c'est un bouton,
 * pas un formulaire. Idempotent — relancé, il ne crée rien de plus — et le
 * compte rendu nomme ce qu'il a fait pour que l'import se vérifie à l'écran.
 */
export async function POST() {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const compteRendu = await importerMarquesDuCatalogue();
  revalidatePath("/", "layout");
  return NextResponse.json(compteRendu);
}
