import { LocalizedLink as Link } from "./localized-link";
import { SlidersHorizontal, RotateCcw, Sparkles, ArrowRight, Check, X } from "lucide-react";
import type { CatalogView, CatalogSort } from "@/server/kk/catalog";
import { besoinParTag } from "@/lib/kk/besoins";
import { ProductCard } from "./product-card";
import { PatternBackdrop } from "./pattern-backdrop";

const SORTS: { key: CatalogSort; label: string }[] = [
  { key: "pertinence", label: "Pertinence" },
  { key: "nouveautes", label: "Nouveautés" },
  { key: "prix-asc", label: "Prix croissant" },
  { key: "prix-desc", label: "Prix décroissant" },
];

function withParams(
  basePath: string,
  brands: string[],
  sort: CatalogSort,
  besoin?: string,
): string {
  const sp = new URLSearchParams();
  if (brands.length) sp.set("marque", brands.join(","));
  if (besoin) sp.set("besoin", besoin);
  if (sort !== "pertinence") sp.set("tri", sort);
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
                <a
                  href={`/${groupSlug}/${c.slug}`}
                  className={`flex items-center justify-between text-sm transition hover:text-deep ${active ? "font-semibold text-deep" : "text-foreground"}`}
                >
                  <span>{c.label}</span>
                  <span className="figure text-xs text-muted-foreground">{c.count}</span>
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

/**
 * Appel au diagnostic, glissé en troisième position de la grille produits.
 *
 * ── Pourquoi il tient toute la largeur sur téléphone ──────────────────────
 * La grille du catalogue est à DEUX colonnes sur mobile. Cette carte y
 * occupait une demi-colonne, soit 161 px sur un écran de 390 — dont 48 partent
 * en padding : il restait 113 px de texte. À cette largeur, « Besoin d'aide ? »
 * renvoyait le point d'interrogation seul à la ligne, et le titre en 20 px se
 * brisait après chaque mot, sur cinq lignes. Une carte produit s'accommode
 * d'une colonne étroite — elle est faite d'une image et de deux lignes ; un
 * bloc de discours, non.
 *
 * Elle passe donc en BANDEAU pleine largeur sous 640 px, avec le pictogramme
 * ramené à gauche du texte plutôt qu'au-dessus : 258 px de texte utile, le
 * titre tient en trois lignes, et le bloc cesse d'être plus haut que les
 * produits qu'il accompagne.
 *
 * Au-delà de 640 px il redevient une cellule de la grille, où il retrouve sa
 * composition verticale et la hauteur minimale qui l'aligne sur les cartes
 * produit voisines.
 */
function DiagnosticCell() {
  return (
    <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-deep p-5 text-primary-foreground sm:col-span-1 sm:min-h-[18rem] sm:flex-col sm:items-stretch sm:justify-between sm:gap-0 sm:p-6">
      <Sparkles className="h-7 w-7 shrink-0 opacity-90" />
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
          Besoin d&rsquo;aide ?
        </p>
        <h3 className="mt-1.5 font-display text-lg leading-snug sm:mt-2 sm:text-xl">
          Trouvez les produits faits pour votre peau
        </h3>
        <Link
          href="/diagnostic"
          className="group mt-3 inline-flex items-center gap-2 rounded-full bg-sand px-5 py-2.5 text-sm font-semibold text-deep transition hover:bg-primary-foreground sm:mt-4"
        >
          Faire le diagnostic
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
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

  // Grille : la carte diagnostic s'insère en 3e position.
  const cells: React.ReactNode[] = [];
  view.products.forEach((p, i) => {
    if (i === 2) cells.push(<DiagnosticCell key="promo" />);
    cells.push(<ProductCard key={p.id} product={p} />);
  });
  if (view.products.length > 0 && view.products.length < 3) cells.push(<DiagnosticCell key="promo" />);

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

        {/* Filtres desktop */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">
            <FiltersPanel {...filterState} />
          </div>
        </aside>

        {/* Grille */}
        <div className="flex-1">
          <p className="mb-6 text-sm text-muted-foreground">
            {view.total} produit{view.total > 1 ? "s" : ""}
          </p>
          {view.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">Aucun produit ne correspond à ces filtres.</p>
              <a href={basePath} className="mt-3 inline-block text-sm font-semibold text-deep underline underline-offset-4">
                Réinitialiser les filtres
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-3">{cells}</div>
          )}
        </div>
      </div>
    </>
  );
}
