import { LocalizedLink as Link } from "./localized-link";
import { SlidersHorizontal, RotateCcw, Check, X } from "lucide-react";
import type { CatalogView, CatalogSort } from "@/server/kk/catalog";
import { besoinParTag } from "@/lib/kk/besoins";
import { ProductCard } from "./product-card";
import { PatternBackdrop } from "./pattern-backdrop";
import { DiagnosticFlottant } from "./diagnostic-flottant";
import { Pagination } from "./pagination";

const SORTS: { key: CatalogSort; label: string }[] = [
  { key: "pertinence", label: "Pertinence" },
  { key: "nouveautes", label: "Nouveautés" },
  { key: "prix-asc", label: "Prix croissant" },
  { key: "prix-desc", label: "Prix décroissant" },
];

/**
 * URL d'un état du rayon : filtres, tri, page.
 *
 * La page n'est PAS reportée par les liens de filtre ou de tri, et c'est
 * voulu : changer de marque depuis la page 3 doit ramener page 1, sinon on
 * atterrit sur une grille vide quand le nouveau filtre rend moins de trois
 * pages. Seuls les liens de pagination passent `page`.
 */
function withParams(
  basePath: string,
  brands: string[],
  sort: CatalogSort,
  besoin?: string,
  page?: number,
): string {
  const sp = new URLSearchParams();
  if (brands.length) sp.set("marque", brands.join(","));
  if (besoin) sp.set("besoin", besoin);
  if (sort !== "pertinence") sp.set("tri", sort);
  // La page 1 reste l'URL nue : deux adresses pour une même grille dilueraient
  // le référencement du rayon.
  if (page && page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

type FilterState = {
  view: CatalogView;
  groupSlug: string;
  currentCategory?: string;
  brands: string[];
  besoin?: string;
  sort: CatalogSort;
  basePath: string;
};

function FiltersPanel({ view, groupSlug, currentCategory, brands, besoin, sort, basePath }: FilterState) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-deep">
          <SlidersHorizontal className="h-4 w-4" /> Filtres
        </h2>
        {(brands.length > 0 || sort !== "pertinence" || besoin) && (
          <a href={basePath} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-deep">
            <RotateCcw className="h-3 w-3" /> Réinitialiser
          </a>
        )}
      </div>

      {/* Catégorie */}
      <div>
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Catégorie
        </h3>
        <ul className="mt-3 space-y-1.5">
          <li>
            <a
              href={`/${groupSlug}`}
              className={`text-sm transition hover:text-deep ${!currentCategory ? "font-semibold text-deep" : "text-foreground"}`}
            >
              Tous les produits
            </a>
          </li>
          {view.categories.map((c) => {
            const active = c.slug === currentCategory;
            return (
              <li key={c.slug}>
                {/* Le nombre de produits par catégorie a été retiré du filtre.
                    Sur un catalogue de cette taille, il chiffrait surtout ce
                    qui manque — « Solaires 3 » se lit comme un rayon vide — et
                    ajoutait une colonne de chiffres à droite d'une liste qu'on
                    parcourt à gauche. Une catégorie sans produit est de toute
                    façon écartée en amont, jamais affichée. */}
                <a
                  href={`/${groupSlug}/${c.slug}`}
                  className={`block text-sm transition hover:text-deep ${active ? "font-semibold text-deep" : "text-foreground"}`}
                >
                  {c.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Marque */}
      {view.brands.length > 0 && (
        <div>
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Marque
          </h3>
          <ul className="mt-3 space-y-1.5">
            {view.brands.map((b) => {
              const active = brands.includes(b);
              const nextBrands = active ? brands.filter((x) => x !== b) : [...brands, b];
              return (
                <li key={b}>
                  <a
                    href={withParams(basePath, nextBrands, sort)}
                    className="flex items-center gap-2.5 text-sm text-foreground transition hover:text-deep"
                  >
                    <span
                      className={`grid h-4 w-4 place-items-center rounded border ${active ? "border-deep bg-deep text-primary-foreground" : "border-border bg-cream"}`}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    {b}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Tri */}
      <div>
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Trier par
        </h3>
        <ul className="mt-3 space-y-1.5">
          {SORTS.map((s) => {
            const active = s.key === sort;
            return (
              <li key={s.key}>
                <a
                  href={withParams(basePath, brands, s.key)}
                  className={`text-sm transition hover:text-deep ${active ? "font-semibold text-deep" : "text-foreground"}`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function CatalogView({
  view,
  groupSlug,
  currentCategory,
  brands,
  besoin,
  sort,
}: {
  view: CatalogView;
  groupSlug: string;
  currentCategory?: string;
  brands: string[];
  besoin?: string;
  sort: CatalogSort;
}) {
  const basePath = currentCategory ? `/${groupSlug}/${currentCategory}` : `/${groupSlug}`;
  const title = view.category?.label ?? view.group.label;
  const filterState: FilterState = { view, groupSlug, currentCategory, brands, besoin, sort, basePath };
  const besoinActif = besoinParTag(besoin);

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
          <p className="lead mx-auto mt-4 max-w-2xl text-primary-foreground">
            Notre sélection experte de soins dermo-cosmétiques. Chaque produit est rigoureusement
            évalué pour son efficacité, sa formulation et son respect de la peau.
          </p>

          {/* Filtre par besoin, arrivé depuis l'accueil : sans cette étiquette,
              le visiteur verrait un rayon amputé sans savoir pourquoi ni
              comment revenir au complet. La croix lève le filtre. */}
          {besoinActif && (
            <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-primary-foreground">Vous cherchez&nbsp;:</span>
              <Link
                href={withParams(basePath, brands, sort)}
                className="group inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 font-medium text-primary-foreground transition hover:bg-primary-foreground/20"
              >
                {besoinActif.label}
                <X className="h-3.5 w-3.5 opacity-70 transition group-hover:opacity-100" aria-hidden="true" />
                <span className="sr-only">Retirer ce filtre</span>
              </Link>
              <span className="text-primary-foreground">
                {view.total} produit{view.total > 1 ? "s" : ""}
              </span>
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl gap-10 px-6 py-10 lg:flex">
        {/* Filtres mobile */}
        <details className="mb-6 rounded-2xl border border-border/70 bg-card p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-deep">
            <SlidersHorizontal className="h-4 w-4" /> Filtres & tri
          </summary>
          <div className="mt-5">
            <FiltersPanel {...filterState} />
          </div>
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
            <FiltersPanel {...filterState} />
          </div>
        </aside>

        {/* Grille */}
        <div className="flex-1">
          <p className="mb-6 text-sm text-muted-foreground">
            {/* Sur un rayon paginé, « 60 produits » seul induit en erreur : on
                en voit trente. On situe donc la tranche dès qu'il y a plus
                d'une page. */}
            {view.pageCount > 1 ? (
              <>
                Produits <span className="font-semibold text-foreground">{view.firstItem}</span>
                {"\u2013"}
                <span className="font-semibold text-foreground">{view.lastItem}</span> sur {view.total}
              </>
            ) : (
              <>
                {view.total} produit{view.total > 1 ? "s" : ""}
              </>
            )}
          </p>
          {view.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">Aucun produit ne correspond à ces filtres.</p>
              <a href={basePath} className="mt-3 inline-block text-sm font-semibold text-deep underline underline-offset-4">
                Réinitialiser les filtres
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-3">{cells}</div>
              <Pagination
                page={view.page}
                pageCount={view.pageCount}
                hrefForPage={(n) => withParams(basePath, brands, sort, besoin, n)}
                ariaLabel="Pagination des produits"
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
