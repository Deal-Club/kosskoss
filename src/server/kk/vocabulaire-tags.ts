import { cache } from "react";
import { prisma } from "@/server/prisma";
import {
  FAMILLE_PEAU,
  FAMILLE_PREOCCUPATION,
  type OptionFacette,
} from "@/lib/kk/facettes";
import { pickText } from "@/server/localizedContent";
import type { ProductTag } from "@/generated/prisma/client";

/**
 * Vocabulaire des facettes, dans la langue de la page.
 *
 * Seules les familles « peau » et « preoccupation » remontent : les autres tags
 * (budget_eco, premium…) servent le diagnostic et n'ont rien à faire dans une
 * barre de filtres.
 *
 * Mémoïsée par `cache()` de React (comme ailleurs dans le dépôt — voir
 * src/server/kk/navigation.ts) : sur une page de rayon, `getCatalog` lit ce
 * même vocabulaire pour ses décomptes, et la page appelle aussi cette fonction
 * directement pour les libellés — deux appels, mêmes arguments, un seul rendu.
 * Sans mémoïsation, ça fait une requête de plus à chaque affichage de rayon.
 */
export const lireVocabulaire = cache(async (locale: string): Promise<OptionFacette[]> => {
  const lignes = await prisma.productTag.findMany({
    where: { active: true, family: { in: [FAMILLE_PEAU, FAMILLE_PREOCCUPATION] } },
    orderBy: [{ family: "asc" }, { position: "asc" }],
    select: { key: true, labelFr: true, labelEn: true, family: true },
  });

  return lignes.map((l) => ({
    key: l.key,
    // Repli sur le français si la traduction n'a pas encore été saisie —
    // via `pickText`, la seule règle de repli du projet (voir
    // src/server/localizedContent.ts). Un `||` direct sur `labelEn` laissait
    // passer une traduction faite uniquement d'espaces.
    label: pickText(l.labelFr, locale === "en" ? l.labelEn : undefined),
    family: l.family,
  }));
});

/** Une entrée du vocabulaire telle que l'écran d'administration la manipule. */
export type ProductTagAdmin = Pick<
  ProductTag,
  "key" | "labelFr" | "labelEn" | "family" | "position" | "active"
>;

/**
 * Vocabulaire complet, familles et entrées désactivées comprises.
 *
 * Contrairement à `lireVocabulaire`, rien n'est filtré ici : l'administrateur
 * doit pouvoir réactiver un tag ou changer sa famille, ce qui suppose de voir
 * aussi ce qui est aujourd'hui hors facettes ou désactivé.
 */
export async function lireVocabulaireAdmin(): Promise<ProductTagAdmin[]> {
  return prisma.productTag.findMany({
    orderBy: [{ family: "asc" }, { position: "asc" }],
  });
}

/**
 * Enregistre le vocabulaire.
 *
 * La clé étant l'identifiant, un `upsert` par entrée suffit : renommer un
 * libellé ne casse aucun lien, et les tags déjà écrits sur les produits
 * continuent de résoudre. La validation du contenu (clé non vide, famille non
 * vide, etc.) est la responsabilité de l'appelant — la route API — pour que
 * cette fonction reste réutilisable sans dupliquer les règles à deux endroits.
 */
export async function enregistrerVocabulaire(items: ProductTagAdmin[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.productTag.upsert({
        where: { key: item.key },
        update: {
          labelFr: item.labelFr,
          labelEn: item.labelEn,
          family: item.family,
          position: item.position,
          active: item.active,
        },
        create: item,
      }),
    ),
  );
}
