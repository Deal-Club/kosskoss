import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, parseStringArray, toProductView } from "./product-view";
import { pickText, needsTranslation } from "@/server/localizedContent";
import type { KKRoutineView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";

/**
 * Lecture des routines prêtes à l'emploi.
 *
 * Le prix n'est jamais lu en base : il est la somme des gestes, recalculée à
 * chaque rendu. Un total recopié se désaligne du catalogue dès le premier
 * changement de tarif, et le visiteur découvrirait l'écart au panier.
 *
 * Les gestes dont le produit est retiré du catalogue ou en rupture disparaissent
 * de la routine plutôt que de la casser : mieux vaut une routine de deux gestes
 * exacte qu'une routine de trois dont un mène à une page morte. Sous deux
 * gestes, la routine cesse d'en être une et n'est plus servie.
 */

const ROUTINE_INCLUDE = {
  steps: {
    orderBy: { position: "asc" },
    include: { product: { include: PRODUCT_VIEW_INCLUDE } },
  },
} as const;

type RoutineRow = Awaited<ReturnType<typeof lireRoutines>>[number];

function lireRoutines(where: { slug?: string; code?: string }) {
  return prisma.routine.findMany({
    where: { active: true, ...where },
    orderBy: { position: "asc" },
    include: ROUTINE_INCLUDE,
  });
}

function toView(row: RoutineRow, locale: Locale): KKRoutineView | null {
  // Repli identique à `toProductView` : `pickText`, jamais un accès direct à
  // un champ `*En` — c'est la seule règle de repli du projet
  // (`src/server/localizedContent.ts`).
  const traduire = needsTranslation(locale);
  // Filtré une fois, réutilisé pour les gestes ET pour les tags agrégés
  // ci-dessous — un produit retiré du catalogue ou en rupture ne doit
  // alimenter ni l'un ni l'autre.
  const gestesServables = row.steps.filter((s) => s.product.active && s.product.stock > 0);
  const steps = gestesServables.map((s, i) => ({
    id: s.id,
    label: pickText(s.label, traduire ? s.labelEn : undefined),
    why: pickText(s.why, traduire ? s.whyEn : undefined),
    // `role` n'a pas de contrepartie *En sur les routines historiques (le
    // champ y est vide) ; sur les routines du master, elle existe. Même
    // règle de repli que partout ailleurs. `moment` n'a pas de contrepartie
    // *En du tout — voir traductions.ts.
    role: pickText(s.role, traduire ? s.roleEn : undefined),
    moment: s.moment,
    product: toProductView(s.product, locale, i),
  }));

  if (steps.length < 2) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: pickText(row.name, traduire ? row.nameEn : undefined),
    claim: pickText(row.claim, traduire ? row.claimEn : undefined),
    description: pickText(row.description, traduire ? row.descriptionEn : undefined),
    besoinTag: row.besoinTag,
    tint: row.tint,
    image: row.image || null,
    href: `/routines/${row.slug}`,
    steps,
    // Le prix ne se lit JAMAIS en base (voir l'en-tête du fichier) : c'est la
    // somme des gestes réellement servables, recalculée à chaque rendu. Sert
    // à la fois la « valeur des produits » et le « prix de la routine » de la
    // fiche (lot 7D, tâche 2) — aucun mécanisme de remise n'existe côté
    // schéma, les deux se lisent donc sur ce même total.
    totalFcfa: steps.reduce((sum, s) => sum + s.product.priceFcfa, 0),
    niveau: row.niveau,
    code: row.code,
    profilCible: pickText(row.profilCible, traduire ? row.profilCibleEn : undefined),
    usageMatin: pickText(row.usageMatin, traduire ? row.usageMatinEn : undefined),
    usageSoir: pickText(row.usageSoir, traduire ? row.usageSoirEn : undefined),
    noteKossKoss: pickText(row.noteKossKoss, traduire ? row.noteKossKossEn : undefined),
    badge: pickText(row.badge, traduire ? row.badgeEn : undefined),
    // Union des tags des produits encore servables, dans l'ordre où ces
    // produits apparaissent dans la routine — pas de tri alphabétique qui
    // désynchroniserait l'ordre d'affichage d'une locale à l'autre.
    tags: Array.from(new Set(gestesServables.flatMap((s) => parseStringArray(s.product.tags)))),
  };
}

/**
 * Les routines publiées. `limit` borne l'affichage de l'accueil ; la page
 * /routines les demande toutes.
 */
export async function getRoutines(locale: Locale, limit?: number): Promise<KKRoutineView[]> {
  const rows = await lireRoutines({});
  const vues = rows.map((r) => toView(r, locale)).filter((v): v is KKRoutineView => v !== null);
  return typeof limit === "number" ? vues.slice(0, limit) : vues;
}

/** Une routine par son slug. `null` si elle n'existe pas ou n'est plus servable. */
export async function getRoutine(slug: string, locale: Locale): Promise<KKRoutineView | null> {
  const [row] = await lireRoutines({ slug });
  return row ? toView(row, locale) : null;
}

/**
 * Une routine par son code du master (`Routine.code`, ex. « TAC-ECO ») —
 * c'est ce que rend la matrice de décision du Diagnostic Beauté
 * (src/lib/kk/diagnostic-matrice.ts), qui ne connaît que des codes, jamais de
 * slugs. `null` si elle n'existe pas, plus n'est active, ou n'est plus
 * servable (moins de deux gestes disponibles — voir `toView`).
 */
export async function getRoutineByCode(code: string, locale: Locale): Promise<KKRoutineView | null> {
  const [row] = await lireRoutines({ code });
  return row ? toView(row, locale) : null;
}

/**
 * Les routines qui contiennent ce produit, dans l'ordre d'affichage habituel
 * (`position`). Sert la section « Complétez votre routine » de la fiche
 * produit (lot 7D).
 *
 * Un produit peut appartenir à plusieurs routines (par exemple un nettoyant
 * repris dans une routine Éco et sa version Premium) : elles sont TOUTES
 * rendues, plutôt qu'une seule choisie arbitrairement — voir le rapport du
 * lot 7D pour la décision. La liste peut être vide (produit d'appoint hors
 * de toute routine), ce qui est un état normal : la section correspondante
 * ne s'affiche alors pas.
 */
export async function getRoutinesForProduct(productId: string, locale: Locale): Promise<KKRoutineView[]> {
  const rows = await prisma.routine.findMany({
    where: { active: true, steps: { some: { productId } } },
    orderBy: { position: "asc" },
    include: ROUTINE_INCLUDE,
  });
  return rows.map((r) => toView(r, locale)).filter((v): v is KKRoutineView => v !== null);
}
