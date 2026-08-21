import { prisma } from "@/server/prisma";
import type { GesteLigne } from "@/lib/kk/gestes-selection";

/** Tous les gestes, actifs ou non, pour l'écran d'administration. */
export async function lireGestes(): Promise<GesteLigne[]> {
  return prisma.diagStep.findMany({ orderBy: { position: "asc" } });
}

/**
 * Enregistre les gestes.
 *
 * La clé étant l'identifiant, un `upsert` par entrée suffit : renommer un
 * libellé ne casse aucun lien, et un geste déjà référencé continue de résoudre.
 * La transaction garantit qu'un réordonnancement partiel ne laisse pas deux
 * gestes à la même position.
 */
export async function enregistrerGestes(items: GesteLigne[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.diagStep.upsert({
        where: { key: item.key },
        update: {
          labelFr: item.labelFr,
          labelEn: item.labelEn,
          category: item.category,
          position: item.position,
          active: item.active,
        },
        create: item,
      }),
    ),
  );
}
