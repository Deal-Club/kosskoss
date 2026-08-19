import { cache } from "react";
import { prisma } from "@/server/prisma";

/**
 * Données de la section « Notre raison d'être ».
 *
 * ── POURQUOI DES CHIFFRES LUS EN BASE ────────────────────────────────────────
 *
 * La section affirmait « un catalogue court », « des circuits identifiés »,
 * « des routines pensées pour vous ». Trois promesses, aucune preuve — et le
 * retour du client portait exactement là : « je ne sais pas ce que cela résout
 * exactement et avec quoi ».
 *
 * Chaque réponse porte désormais son moyen, chiffré. Ces chiffres sont comptés
 * au rendu et jamais écrits à la main : « 71 références » ne peut pas se
 * désaligner du catalogue le jour où l'on en retire dix. Une preuve fausse est
 * pire qu'une promesse vague.
 *
 * Trois comptages, rien de plus. Une routine complète était aussi chargée ici,
 * pour un second étage qui montrait ses trois gestes ; ce bloc a été retiré, et
 * la requête avec lui — l'accueil n'a pas à payer une jointure pour un contenu
 * qui ne s'affiche plus.
 */

export interface RaisonDetreView {
  /** Références actives au catalogue. Prouve « catalogue court ». */
  produits: number;
  /** Maisons distribuées. Prouve « circuits identifiés » — elles sont nommées. */
  marques: number;
  /** Questions du diagnostic. Prouve « une routine pour VOTRE peau ». */
  questions: number;
}

export const getRaisonDetre = cache(async (): Promise<RaisonDetreView> => {
  const [produits, marques, questions] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.findMany({
      where: { active: true },
      select: { brand: true },
      distinct: ["brand"],
    }),
    prisma.diagQuestion.count(),
  ]);

  return {
    produits,
    marques: marques.filter((m) => m.brand.length > 0).length,
    questions,
  };
});
