import { prisma } from "@/server/prisma";
import { PRODUCT_VIEW_INCLUDE, toProductView } from "./product-view";
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
  const steps = row.steps
    .filter((s) => s.product.active && s.product.stock > 0)
    .map((s, i) => ({
      id: s.id,
      label: pickText(s.label, traduire ? s.labelEn : undefined),
      why: pickText(s.why, traduire ? s.whyEn : undefined),
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
    totalFcfa: steps.reduce((sum, s) => sum + s.product.priceFcfa, 0),
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
