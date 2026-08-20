import { prisma } from "@/server/prisma";
import {
  FAMILLE_PEAU,
  FAMILLE_PREOCCUPATION,
  type OptionFacette,
} from "@/lib/kk/facettes";

/**
 * Vocabulaire des facettes, dans la langue de la page.
 *
 * Seules les familles « peau » et « preoccupation » remontent : les autres tags
 * (budget_eco, premium…) servent le diagnostic et n'ont rien à faire dans une
 * barre de filtres.
 */
export async function lireVocabulaire(locale: string): Promise<OptionFacette[]> {
  const lignes = await prisma.productTag.findMany({
    where: { active: true, family: { in: [FAMILLE_PEAU, FAMILLE_PREOCCUPATION] } },
    orderBy: [{ family: "asc" }, { position: "asc" }],
    select: { key: true, labelFr: true, labelEn: true, family: true },
  });

  return lignes.map((l) => ({
    key: l.key,
    // Repli sur le français si la traduction n'a pas encore été saisie : mieux
    // vaut un libellé dans l'autre langue qu'une case sans étiquette.
    label: locale === "en" ? l.labelEn || l.labelFr : l.labelFr,
    family: l.family,
  }));
}
