import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import {
  listerProduitsPourRoutine,
  BESOIN_OPTIONS,
  NIVEAU_OPTIONS,
} from "@/server/kk/routine-admin";
import { RoutineEditor } from "@/components/admin/RoutineEditor";

export const metadata: Metadata = { title: "Créer une routine — Administration" };

export default async function AdminNouvelleRoutinePage() {
  await requireCapacitePage("reglages");
  const produits = await listerProduitsPourRoutine();
  return (
    <RoutineEditor routine={null} produits={produits} besoins={BESOIN_OPTIONS} niveaux={NIVEAU_OPTIONS} />
  );
}
