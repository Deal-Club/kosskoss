import type { CatalogSort } from "@/server/kk/catalog";
import { FAMILLE_PEAU, type FacetteSelection } from "./facettes";

const SORTS = new Set<CatalogSort>(["pertinence", "prix-asc", "prix-desc", "nouveautes"]);

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Liste de clés séparées par des virgules (`?peau=grasse,mixte`), dédupliquée
 * et débarrassée des entrées vides. Comme pour `parseBrands`, aucune clé n'est
 * validée contre un vocabulaire connu : une clé qui ne correspond à aucun tag
 * réel ne fait simplement correspondre aucun produit, ce qui n'est pas une
 * erreur — voir la contrainte globale sur les valeurs d'URL inconnues.
 */
function list(value: string | string[] | undefined): string[] {
  const v = one(value);
  if (!v) return [];
  const cles = new Set<string>();
  for (const part of v.split(",")) {
    const cle = part.trim();
    if (cle) cles.add(cle);
  }
  return [...cles];
}

export function parseSort(value: string | string[] | undefined): CatalogSort {
  const v = one(value);
  return v && SORTS.has(v as CatalogSort) ? (v as CatalogSort) : "pertinence";
}

export function parseBrands(value: string | string[] | undefined): string[] {
  const v = one(value);
  return v
    ? v.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

/**
 * Page demandée (`?page=2`). Une valeur absurde — « 0 », « abc », « -3 » —
 * ramène à la première page plutôt qu'à une erreur : une URL malformée doit
 * afficher le rayon, pas un 500. Le plafond, lui, est appliqué par getCatalog,
 * seul à connaître le nombre de pages.
 */
export function parsePage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(one(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Une entrée de vocabulaire telle qu'il faut la connaître ici : la clé et sa
 * famille. `OptionFacette` (src/lib/kk/facettes.ts) porte davantage (le
 * libellé), mais ce module n'a besoin que de ces deux champs — n'importer que
 * ce qui sert évite de coupler ce paramètre à la forme exacte de la vue.
 */
export type EntreeVocabulaire = { key: string; family: string };

/**
 * Facettes demandées dans l'URL — `?peau=grasse,mixte&preoccupation=taches` —
 * réparties dans les deux familles que `produitCorrespondFacettes` sait
 * combiner (union dans une famille, intersection entre familles).
 *
 * Compatibilité : l'ancien paramètre `?besoin=` circule encore dans des liens
 * partagés et, surtout, dans les résultats du Diagnostic Beauté. Il continue
 * de fonctionner ici — un `besoin` reçu est versé dans la bonne famille, en
 * plus des clés déjà présentes dans `peau`/`preoccupation`. Un lien de
 * diagnostic ne doit jamais casser : c'est la fonctionnalité la plus visible
 * de la boutique.
 *
 * Le routage dérive du VOCABULAIRE RÉEL (`vocabulaire`, lu par
 * `lireVocabulaire` — src/server/kk/vocabulaire-tags.ts), pas d'une liste
 * figée dans le code : une clé administrable ajoutée après coup (un type de
 * peau, une préoccupation) est routée correctement dès sa création, sans
 * modifier ce module. Une ancienne liste statique (`src/lib/kk/besoins.ts`)
 * a longtemps servi ici et a divergé du vocabulaire administrable — trois clés
 * actives (peau_normale, anti_age, apaisant) y étaient inconnues, un `?besoin=`
 * les portant disparaissait alors en silence. Ce module reste pur : c'est
 * l'appelant (une page, qui a déjà accès à Prisma) qui fournit `vocabulaire`,
 * jamais un import direct d'un module impur ici.
 *
 * Une clé absente du vocabulaire (tag réellement retiré) reste ignorée
 * plutôt que de lever une erreur — même repli que pour une clé de
 * `peau`/`preoccupation` inconnue.
 */
export function parseFacettes(
  sp: {
    peau?: string | string[];
    preoccupation?: string | string[];
    besoin?: string | string[];
  },
  vocabulaire: EntreeVocabulaire[],
): FacetteSelection {
  const peau = list(sp.peau);
  const preoccupation = list(sp.preoccupation);

  const besoin = one(sp.besoin);
  if (besoin) {
    const entree = vocabulaire.find((v) => v.key === besoin);
    if (entree) {
      const cible = entree.family === FAMILLE_PEAU ? peau : preoccupation;
      if (!cible.includes(besoin)) cible.push(besoin);
    }
  }

  return { peau, preoccupation };
}

export type FacettePrix = { min?: number; max?: number };

/**
 * Borne haute d'un entier Postgres `Int` (signé, 32 bits) — c'est la colonne
 * `priceCents` qui reçoit cette borne dans `getCatalog` (`gte`/`lte`).
 * Au-delà, Prisma lève au lieu d'exécuter la requête : un `?prixMax=` de dix
 * chiffres tapé dans le champ (aucun `max` HTML ne l'en empêchait) faisait
 * alors tomber toute la page de rayon à zéro produit — la faute la plus
 * grave relevée en revue sur ce lot. Le champ HTML porte aussi un `max`
 * (voir catalog-filters.tsx), mais c'est ICI que la borne est réellement
 * tenue : un `max` HTML se contourne (DevTools, requête directe).
 */
const BORNE_PRIX_MAX = 2_147_483_647;

function parseBorne(value: string | string[] | undefined): number | undefined {
  const v = one(value);
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  // Le FCFA n'a pas de sous-unité : la borne est un franc entier, jamais une
  // division par 100. Une valeur absurde (négative, non numérique, ou au-delà
  // de ce qu'une colonne Postgres `Int` peut recevoir) est ramenée dans les
  // clous plutôt que de produire une borne fausse ou de faire lever Prisma.
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(n, BORNE_PRIX_MAX);
}

/**
 * Bornes de prix demandées dans l'URL (`?prixMin=&prixMax=`), en francs CFA
 * entiers. Des bornes inversées (min > max) sont échangées plutôt que de
 * rendre un rayon vide : un visiteur qui a permuté les deux champs doit voir
 * un rayon filtré, pas une page muette.
 */
export function parsePrix(sp: {
  prixMin?: string | string[];
  prixMax?: string | string[];
}): FacettePrix {
  const min = parseBorne(sp.prixMin);
  const max = parseBorne(sp.prixMax);
  if (min !== undefined && max !== undefined && min > max) {
    return { min: max, max: min };
  }
  return { min, max };
}
