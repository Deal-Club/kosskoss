import { getTranslations } from "next-intl/server";
import { LocalizedLink as Link } from "./localized-link";
import { SlidersHorizontal } from "lucide-react";
import type { CatalogView as CatalogViewData, CatalogSort } from "@/server/kk/catalog";
import type { FacetteSelection, OptionFacette } from "@/lib/kk/facettes";
import type { FacettePrix } from "@/lib/kk/catalog-params";
import type { Locale } from "@/i18n/routing";
import { ProductCard } from "./product-card";
import { PatternBackdrop } from "./pattern-backdrop";
import { DiagnosticFlottant } from "./diagnostic-flottant";
import { Pagination } from "./pagination";
import { ActiveFilters, FiltersPanel, activeFilterCount, withParams, type CatalogFilterState } from "./catalog-filters";

/**
 * Rayon du catalogue.
 *
 * Quatre familles de filtre — catégorie, marque, type de peau, préoccupation
 * — plus le prix et le tri, tous combinés dans l'URL (voir `withParams` dans
 * `catalog-filters.tsx`) : un rayon filtré se partage et se remet en favori.
 *
 * RÈGLE DE COMBINAISON, visible à l'écran par les décomptes et par le
 * résultat lui-même : union DANS une famille (cocher deux types de peau
 * élargit), intersection ENTRE familles (cocher un type de peau ET une
 * préoccupation restreint). Voir `produitCorrespondFacettes` dans
 * `src/lib/kk/facettes.ts` et le `where` construit par `getCatalog`.
 *
 * `?besoin=` — l'ancien paramètre à choix unique, encore présent dans des
 * liens partagés et dans les résultats du Diagnostic Beauté — continue de
 * fonctionner : `parseFacettes` (appelé par les pages `[group]`) le verse dans
 * la bonne famille avant d'arriver ici. Cet écran ne le connaît plus en tant
 * que tel, il ne voit qu'une `FacetteSelection` déjà résolue.
 */

export async function CatalogView({
  view,
  groupSlug,
  currentCategory,
  brands,
  selection,
  prix,
  sort,
  vocabulaire,
  locale,
}: {
  view: CatalogViewData;
  groupSlug: string;
  currentCategory?: string;
  brands: string[];
  selection: FacetteSelection;
  prix: FacettePrix;
  sort: CatalogSort;
  vocabulaire: OptionFacette[];
  locale: Locale;
}) {
  const t = await getTranslations("catalog");
  const basePath = currentCategory ? `/${groupSlug}/${currentCategory}` : `/${groupSlug}`;
  const title = view.category?.label ?? view.group.label;

  const state: CatalogFilterState = {
    brands,
    peau: selection.peau,
    preoccupation: selection.preoccupation,
    prixMin: prix.min,
    prixMax: prix.max,
    sort,
  };
  const filterCount = activeFilterCount(state);

  // Rendu deux fois — mobile repliable, bureau fixe — chacun avec son propre
  // `idPrefix` : les deux panneaux ne peuvent pas partager les mêmes `id` de
  // champ de prix, sous peine de casser l'association `<label for>` du
  // second (voir catalog-filters.tsx).
  const filtersPanelMobile = (
    <FiltersPanel
      view={view}
      groupSlug={groupSlug}
      currentCategory={currentCategory}
      state={state}
      basePath={basePath}
      vocabulaire={vocabulaire}
      locale={locale}
      t={t}
      idPrefix="mobile"
    />
  );
  const filtersPanelDesktop = (
    <FiltersPanel
      view={view}
      groupSlug={groupSlug}
      currentCategory={currentCategory}
      state={state}
      basePath={basePath}
      vocabulaire={vocabulaire}
      locale={locale}
      t={t}
      idPrefix="desktop"
    />
  );

  // Grille : rien que des produits. L'appel au diagnostic occupait ici une
  // cellule entière ; il flotte désormais (voir DiagnosticFlottant), ce qui
  // rend sa place à un produit et le garde visible pendant tout le défilement.
  const cells = view.products.map((p) => <ProductCard key={p.id} product={p} />);

  return (
    <>
      {/* Bandeau de tête sur le vert profond de la charte : le contraste donne
          du poids au titre de rayon. Le motif de marque y est posé comme sur
          tous les bandeaux sombres hors accueil — celui-ci est le plus répété
          du site, il se voit sur chaque rayon, d'où le voile qui l'assourdit. */}
      <section className="relative overflow-hidden bg-deep text-primary-foreground">
        <PatternBackdrop align="center" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 text-center">
          <p className="eyebrow eyebrow-on-dark">{view.group.label}</p>
          <h1 className="mt-3">{title}</h1>
          <p className="lead mx-auto mt-4 max-w-2xl text-primary-foreground">{t("heroLead")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl gap-10 px-6 py-10 lg:flex">
        {/* Filtres mobile : un panneau qu'on ouvre, pas deux écrans de cases
            avant le premier produit — un rayon ne se parcourt pas ainsi au
            téléphone. */}
        <details className="mb-6 rounded-2xl border border-border/70 bg-card p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-deep">
            <SlidersHorizontal className="h-4 w-4" /> {t("filtersAndSort")}
          </summary>
          <div className="mt-5">{filtersPanelMobile}</div>
        </details>

        {/* Filtres desktop.

            La colonne défile pour son propre compte : collée à 6rem du haut
            (top-24), elle dépassait le bas de l'écran dès que la liste des
            marques s'allongeait, et le bas restait inatteignable — la page,
            elle, était déjà en butée. D'où max-h = 100vh moins les 6rem de
            décalage et 1rem de respiration.

            `overscroll-contain` empêche la molette de repartir sur la page
            quand on arrive au bout de la liste ; `pr-2` garde la barre de
            défilement à l'écart du texte.

            `pb-16` réserve la hauteur de la pastille diagnostic, qui flotte en
            bas à gauche, donc juste au-dessus de cette colonne : sans cette
            réserve, elle masquait les derniers critères de tri. */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-2 pb-16">
            {filtersPanelDesktop}
          </div>
        </aside>

        {/* Grille */}
        <div className="flex-1">
          <div className="mb-6 space-y-3">
            {/* Résumé des filtres actifs — chacun retirable individuellement,
                plus un « tout effacer » — visible que le rayon rende des
                produits ou non. */}
            <ActiveFilters state={state} vocabulaire={vocabulaire} basePath={basePath} t={t} />
            <p className="text-sm text-muted-foreground">
              {/* Sur un rayon paginé, « 60 produits » seul induit en erreur : on
                  en voit trente. On situe donc la tranche dès qu'il y a plus
                  d'une page. */}
              {view.pageCount > 1
                ? t.rich("countRange", {
                    first: view.firstItem,
                    last: view.lastItem,
                    total: view.total,
                    b: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
                  })
                : t("countTotal", { total: view.total })}
            </p>
          </div>
          {view.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">{t("emptyText")}</p>
              {/* Zéro résultat n'est jamais muet : on dit combien de filtres
                  sont actifs, et les puces ci-dessus (ActiveFilters) proposent
                  déjà d'en retirer un individuellement, ou tous d'un coup. */}
              {filterCount > 0 && (
                <p className="mt-2 text-sm font-medium text-foreground">
                  {t("emptyActiveCount", { count: filterCount })}
                </p>
              )}
              <Link href={basePath} className="mt-3 inline-block text-sm font-semibold text-deep underline underline-offset-4">
                {t("emptyReset")}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-3">{cells}</div>
              <Pagination
                page={view.page}
                pageCount={view.pageCount}
                hrefForPage={(n) => withParams(basePath, state, n)}
                ariaLabel={t("paginationAriaLabel")}
              />
            </>
          )}
        </div>
      </div>

      {/* Raccourci vers le diagnostic : hors flux, donc sans cellule volée à la
          grille, et visible pendant tout le défilement. */}
      <DiagnosticFlottant />
    </>
  );
}
