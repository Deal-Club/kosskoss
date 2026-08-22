import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import { importerMarquesDuCatalogue } from "@/server/kk/marques";

/**
 * Rattache les produits à leur marque, sans corps de requête : c'est un bouton,
 * pas un formulaire. Idempotent EN ACCÈS SÉRIALISÉ — relancé l'un après
 * l'autre, il ne crée rien de plus — et le compte rendu nomme ce qu'il a fait
 * pour que l'import se vérifie à l'écran.
 *
 * Deux clics simultanés (deux administrateurs, ou deux onglets) ne sont PAS
 * couverts par cette idempotence : la lecture des marques existantes puis
 * leur création n'est pas verrouillée, et le second à écrire prend un `P2002`
 * sur la contrainte d'unicité du nom (ou du slug, généré par la même course).
 * Aucune corruption — relancer répare — mais laisser remonter l'erreur brute
 * afficherait « L'import a échoué » sans explication. On la nomme donc ici.
 */
export async function POST() {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  try {
    const compteRendu = await importerMarquesDuCatalogue();
    revalidatePath("/", "layout");
    return NextResponse.json(compteRendu);
  } catch (error) {
    const concurrent =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
    if (concurrent) {
      return NextResponse.json(
        { error: "Un import est déjà en cours. Rechargez la page dans quelques secondes." },
        { status: 409 },
      );
    }
    console.error("[brands/import] Import impossible :", error);
    return NextResponse.json({ error: "Import impossible." }, { status: 500 });
  }
}
