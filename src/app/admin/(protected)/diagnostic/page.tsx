import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { lireArbreDiagnostic } from "@/server/kk/arbre-diagnostic";
import { ArbreDiagnostic } from "@/components/admin/ArbreDiagnostic";

export const metadata: Metadata = { title: "Diagnostic beauté — Administration" };

/**
 * Page principale du Diagnostic beauté : l'ARBRE de décision. Tout part de là —
 * modifier les questions (sous-page), éditer une routine (clic sur une routine).
 */
export default async function AdminDiagnosticPage() {
  await requireCapacitePage("reglages");
  const data = await lireArbreDiagnostic("fr");
  return <ArbreDiagnostic data={data} />;
}
