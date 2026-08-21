import { prisma } from "@/server/prisma";
import type { GesteLigne } from "@/lib/kk/gestes-selection";

/** Tous les gestes, actifs ou non, pour l'écran d'administration. */
export async function lireGestes(): Promise<GesteLigne[]> {
  return prisma.diagStep.findMany({ orderBy: { position: "asc" } });
}
