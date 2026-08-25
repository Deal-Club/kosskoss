import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { lireArbreDiagnostic } from "@/server/kk/arbre-diagnostic";
import { ArbreDiagnostic } from "@/components/admin/ArbreDiagnostic";

export const metadata: Metadata = { title: "Arbre du diagnostic — Administration" };

export default async function AdminArbrePage() {
  await requireCapacitePage("reglages");
  const data = await lireArbreDiagnostic("fr");
  return <ArbreDiagnostic data={data} />;
}
