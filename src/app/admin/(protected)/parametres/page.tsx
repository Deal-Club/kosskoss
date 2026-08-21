import type { Metadata } from "next";
import { getParametres } from "@/server/kk/parametres";
import { ParametresAdmin } from "@/components/admin/ParametresAdmin";

export const metadata: Metadata = { title: "Paramètres de la boutique — Administration" };

export default async function AdminParametresPage() {
  const parametres = await getParametres();
  return <ParametresAdmin initial={parametres} />;
}
