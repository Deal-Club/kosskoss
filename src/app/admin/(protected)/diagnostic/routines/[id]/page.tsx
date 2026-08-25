import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCapacitePage } from "@/lib/dal";
import {
  lireRoutineAdmin,
  listerProduitsPourRoutine,
  BESOIN_OPTIONS,
  NIVEAU_OPTIONS,
} from "@/server/kk/routine-admin";
import { RoutineEditor } from "@/components/admin/RoutineEditor";

export const metadata: Metadata = { title: "Modifier une routine — Administration" };

export default async function AdminRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapacitePage("reglages");
  const { id } = await params;
  const routine = await lireRoutineAdmin(id);
  if (!routine) notFound();
  const produits = await listerProduitsPourRoutine();
  return (
    <RoutineEditor routine={routine} produits={produits} besoins={BESOIN_OPTIONS} niveaux={NIVEAU_OPTIONS} />
  );
}
