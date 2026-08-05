"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { CategoryFilters, PRICE_RANGES } from "@/components/CategoryFilters";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { parsePrice } from "@/lib/price";
import { useDismissable } from "@/lib/useDismissable";
import type { Product } from "@/types/home";

// Valeurs internes : elles ne sont jamais affichées, seul le libellé est traduit.
type SortOption = "relevance" | "price-asc" | "price-desc" | "newest";

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "relevance", labelKey: "sortRelevance" },
  { value: "price-asc", labelKey: "sortPriceAsc" },
  { value: "price-desc", labelKey: "sortPriceDesc" },
  { value: "newest", labelKey: "sortNewest" },
];

export function CategoryProductBrowser({ products }: { products: Product[] }) {
  const t = useTranslations("category");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string | null>(null);
  const [minRatings, setMinRatings] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  // Sous « lg », les filtres vivent dans un panneau à la demande plutôt que
  // devant la grille : les découvrir avant le moindre produit, sur un écran
  // qu'il faut déjà faire défiler, écarte plus de visiteurs que ça n'aide.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filtersPanelId = useId();
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const filtersCloseRef = useRef<HTMLButtonElement>(null);
  const closeMobileFilters = () => setMobileFiltersOpen(false);
  useDismissable(mobileFiltersOpen, closeMobileFilters);

  // Même va-et-vient du focus que le tiroir du panier : au clavier, la
  // fermeture ne doit pas laisser l'utilisateur perdu en haut de la page.
  const wasFiltersOpen = useRef(false);
  useEffect(() => {
    if (mobileFiltersOpen) {
      wasFiltersOpen.current = true;
      filtersCloseRef.current?.focus();
    } else if (wasFiltersOpen.current) {
      wasFiltersOpen.current = false;
      filtersButtonRef.current?.focus({ preventScroll: true });
    }
  }, [mobileFiltersOpen]);

  const brandOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
    }
    return Array.from(counts, ([brand, count]) => ({ brand, count })).sort((a, b) =>
      a.brand.localeCompare(b.brand),
    );
  }, [products]);

  const activePriceRange = useMemo(
    () => PRICE_RANGES.find((range) => range.id === priceRange) ?? null,
    [priceRange],
  );

  const filteredProducts = useMemo(() => {
    const minRating = minRatings.length > 0 ? Math.min(...minRatings) : null;

    const filtered = products.filter((product) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false;
      if (activePriceRange) {
        const price = parsePrice(product.price);
        if (price < activePriceRange.min || price > activePriceRange.max) return false;
      }
      if (minRating !== null && (product.rating ?? 0) < minRating) return false;
      if (inStockOnly && product.inStock === false) return false;
      return true;
    });

    const sorted = [...filtered];
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === "newest") {
      // Le badge « Neu » vient du catalogue et n'est pas traduit
      sorted.sort((a, b) => Number(b.badge === "Neu") - Number(a.badge === "Neu"));
    }
    return sorted;
  }, [products, selectedBrands, activePriceRange, minRatings, inStockOnly, sortBy]);

  const activeFilterCount =
    selectedBrands.length + (priceRange !== null ? 1 : 0) + minRatings.length + (inStockOnly ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  function toggleBrand(brand: string) {
    setSelectedBrands((current) =>
      current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand],
    );
  }

  function toggleMinRating(rating: number) {
    setMinRatings((current) =>
      current.includes(rating) ? current.filter((item) => item !== rating) : [...current, rating],
    );
  }

  function resetFilters() {
    setSelectedBrands([]);
    setPriceRange(null);
    setMinRatings([]);
    setInStockOnly(false);
  }

  const filtersProps = {
    brandOptions,
    selectedBrands,
    onToggleBrand: toggleBrand,
    priceRange,
    onSelectPriceRange: setPriceRange,
    minRatings,
    onToggleMinRating: toggleMinRating,
    inStockOnly,
    onToggleInStockOnly: () => setInStockOnly((current) => !current),
    onReset: resetFilters,
    hasActiveFilters,
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Barre latérale : uniquement à partir de « lg », où la largeur ne
          manque pas. En dessous, les filtres vivent dans le panneau plus bas —
          les dupliquer ici plutôt que les déplacer en JS évite tout à-coup au
          changement de largeur. */}
      <div className="hidden lg:block">
        <CategoryFilters {...filtersProps} namePrefix="desktop" />
      </div>

      <div className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <p className="text-sm text-muted-foreground">
            {t.rich("productsCount", {
              filtered: filteredProducts.length,
              total: products.length,
              b: (chunks) => <span className="font-bold text-foreground">{chunks}</span>,
            })}
          </p>

          <div className="flex items-center gap-2">
            {/* Sous « lg », c'est la seule porte d'entrée vers les filtres :
                la barre latérale ne s'affiche qu'au-delà. */}
            <button
              ref={filtersButtonRef}
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={mobileFiltersOpen}
              aria-controls={filtersPanelId}
              className="relative flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("filtersTitle")}
              {hasActiveFilters && (
                <span className="messwert flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-black text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted-foreground sm:inline">{t("sortBy")}</span>
              <select
                aria-label={t("sortBy")}
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-sm border border-border bg-white px-2 py-1.5 text-sm font-semibold text-foreground"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <Reveal key={product.slug ?? product.name} delay={Math.min(index * 60, 300)}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border py-16 text-center">
            <p className="font-semibold text-foreground">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("emptyReset")}
            </button>
          </div>
        )}
      </div>

      {/* Panneau de filtres mobile : un tiroir qui remonte du bas, plutôt que
          du côté — c'est le geste le plus naturel au pouce sur un téléphone,
          et il laisse toute la largeur aux champs (marque, prix, note). */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("filtersClose")}
            onClick={closeMobileFilters}
            className="absolute inset-0 bg-black/50 motion-safe:animate-in motion-safe:fade-in"
          />

          <div
            id={filtersPanelId}
            role="dialog"
            aria-modal="true"
            aria-label={t("filtersTitle")}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-lg bg-white shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-black text-foreground">
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                {t("filtersTitle")}
              </h2>
              <button
                ref={filtersCloseRef}
                type="button"
                onClick={closeMobileFilters}
                aria-label={t("filtersClose")}
                className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <CategoryFilters {...filtersProps} namePrefix="mobile" showHeader={false} />
            </div>

            <footer className="shrink-0 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={closeMobileFilters}
                className="flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                {t("filtersApply", { count: filteredProducts.length })}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
