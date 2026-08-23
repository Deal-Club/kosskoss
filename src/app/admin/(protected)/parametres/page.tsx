import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { getParametres, jetonCapiConfigure } from "@/server/kk/parametres";
import { ParametresAdmin } from "@/components/admin/ParametresAdmin";

export const metadata: Metadata = { title: "Paramètres de la boutique — Administration" };

export default async function AdminParametresPage() {
  await requireCapacitePage("reglages");
  const [parametres, capiConfigured] = await Promise.all([getParametres(), jetonCapiConfigure()]);
  return <ParametresAdmin initial={parametres} capiConfigured={capiConfigured} />;
}
