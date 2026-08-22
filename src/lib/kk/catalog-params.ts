import type { CatalogSort } from "@/server/kk/catalog";
import { besoinParTag, TYPES_DE_PEAU } from "./besoins";
import { type FacetteSelection } from "./facettes";

const SORTS = new Set<CatalogSort>(["pertinence", "prix-asc", "prix-desc", "nouveautes"]);

/** Étiquettes de type de peau, pour router un `besoin` hérité vers sa famille. */
const TAGS_PEAU = new Set(TYPES_DE_PEAU.map((b) => b.tag));

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
 * Besoin demandé dans l'URL (`?besoin=taches`). Une valeur inconnue est
 * ignorée plutôt que de renvoyer une erreur : un lien périmé affiche alors le
 * catalogue entier, ce qui reste utile.
 */
export function parseBesoin(value: string | string[] | undefined): string | undefined {
  return besoinParTag(one(value))?.tag;
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
 * Facettes demandées dans l'URL — `?peau=grasse,mixte&preoccupation=taches` —
 * réparties dans les deux familles que `produitCorrespondFacettes` sait
 * combiner (union dans une famille, intersection entre familles).
 *
 * Compatibilité : l'ancien paramètre `?besoin=` circule encore dans des liens
 * partagés et, surtout, dans les résultats du Diagnostic Beauté. Il continue
 * de fonctionner ici — un `besoin` reçu est traduit via `besoinParTag` puis
 * versé dans la bonne famille (type de peau ou préoccupation), en plus des
 * clés déjà présentes dans `peau`/`preoccupation`. Un lien de diagnostic ne
 * doit jamais casser : c'est la fonctionnalité la plus visible de la boutique.
 */
export function parseFacettes(sp: {
  peau?: string | string[];
  preoccupation?: string | string[];
  besoin?: string | string[];
}): FacetteSelection {
  const peau = list(sp.peau);
  const preoccupation = list(sp.preoccupation);

  const besoin = besoinParTag(one(sp.besoin));
  if (besoin) {
    const cible = TAGS_PEAU.has(besoin.tag) ? peau : preoccupation;
    if (!cible.includes(besoin.tag)) cible.push(besoin.tag);
  }

  return { peau, preoccupation };
}

export type FacettePrix = { min?: number; max?: number };

function parseBorne(value: string | string[] | undefined): number | undefined {
  const v = one(value);
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  // Le FCFA n'a pas de sous-unité : la borne est un franc entier, jamais une
  // division par 100. Une valeur absurde (négative, non numérique) est
  // ignorée plutôt que de produire une borne fausse.
  return Number.isFinite(n) && n >= 0 ? n : undefined;
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
