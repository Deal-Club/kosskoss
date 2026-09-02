import { cache } from "react";
import { prisma } from "@/server/prisma";
import { pickText, needsTranslation } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";

/**
 * Marque mise en avant sur l'accueil — bloc 3 de la structure fournie par le
 * client (« FOCUS MARQUE : mise en avant Nubiance · storytelling + bénéfices ·
 * produits phares »).
 *
 * La maison en vedette est nommée ici et non écrite dans le composant, mais
 * elle n'est pas imposée non plus : si elle quitte le catalogue, la section se
 * masque plutôt que d'annoncer une marque qu'on ne distribue plus.
 */

export interface BrandFocusView {
  brand: string;
  claim: string;
  description: string;
  /** Nombre de références servables — c'est la seule preuve chiffrée du bloc. */
  productCount: number;
}

/**
 * Maison mise en avant, avec son argumentaire.
 *
 * Nubiance est celle de la maquette, et c'est cohérent : c'est la seule marque
 * du catalogue formulée spécifiquement pour les peaux noires et métissées,
 * c'est-à-dire exactement le positionnement de la boutique. Le jour où le choix
 * change, il se change ici — ou au back-office, quand la table des réglages
 * portera ce champ.
 */
const FOCUS = {
  brand: "Nubiance",
  claim: "L'expertise au service des peaux d'exception",
  claimEn: "Expertise devoted to exceptional skin",
  description:
    "Marque dermatologique française pensée spécifiquement pour les peaux noires, mates et métissées. Des formules ciblées, des actifs dosés, et des résultats mesurés sur les problématiques qui concernent réellement cette clientèle — taches, hyperpigmentation, irrégularités du teint.",
  descriptionEn:
    "A French dermatological brand designed specifically for Black, dark, and mixed-heritage skin. Targeted formulas, precisely dosed actives, and results measured against the concerns that actually affect this clientele — dark spots, hyperpigmentation, uneven skin tone.",
} as const;

/**
 * Maison mise en avant, avec son argumentaire — dans la langue de la page.
 *
 * `FOCUS` est un texte de code, pas une ligne de base : il n'existait qu'en
 * français jusqu'ici, donc systématiquement affiché en français même sur la
 * boutique anglaise. Même règle de repli que tout le reste du catalogue
 * (`pickText`) : la variante anglaise manquante retomberait sur le français
 * plutôt que de laisser un bloc vide.
 */
export const getBrandFocus = cache(async (locale: Locale): Promise<BrandFocusView | null> => {
  // Un simple comptage : le bloc ne montre plus de packshots, il n'a donc plus
  // besoin de charger quatre produits complets à chaque rendu de l'accueil.
  const productCount = await prisma.product.count({
    where: { brand: FOCUS.brand, active: true, stock: { gt: 0 } },
  });

  if (productCount === 0) return null;

  const traduire = needsTranslation(locale);
  return {
    brand: FOCUS.brand,
    claim: pickText(FOCUS.claim, traduire ? FOCUS.claimEn : undefined),
    description: pickText(FOCUS.description, traduire ? FOCUS.descriptionEn : undefined),
    productCount,
  };
});
