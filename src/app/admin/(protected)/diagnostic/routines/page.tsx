import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { listerRoutinesAdmin } from "@/server/kk/routine-admin";
import { RoutinesListe } from "@/components/admin/RoutinesListe";

export const metadata: Metadata = { title: "Routines — Administration" };

export default async function AdminRoutinesPage() {
  await requireCapacitePage("reglages");
  const routines = await listerRoutinesAdmin();
  return <RoutinesListe routines={routines} />;
}
