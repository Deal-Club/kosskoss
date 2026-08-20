"use client";

import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OptionFacette } from "@/lib/kk/facettes";

// L'identifiant "id" est stable et sert d'état ; seul le libellé est traduit,
// via "category.priceRanges.<id>".
export interface PriceRange {
  id: string;
  min: number;
  max: number;
}

/**
 * Tranches de prix en FCFA, calées sur le catalogue réel : les références vont
 * d'environ 4 500 à 30 000 FCFA. Les bornes héritées de l'ancien projet
 * (0-100 €, 100-300 €…) rangeaient l'intégralité du catalogue dans la dernière
 * tranche — le filtre était donc décoratif.
 */
export const PRICE_RANGES: PriceRange[] = [
  { id: "under5000", min: 0, max: 5_000 },
  { id: "from5000", min: 5_000, max: 10_000 },
  { id: "from10000", min: 10_000, max: 15_000 },
  { id: "from15000", min: 15_000, max: 25_000 },
  { id: "over25000", min: 25_000, max: Infinity },
];

export const RATING_THRESHOLDS = [4.5, 4, 3];

interface BrandOption {
  brand: string;
  count: number;
}

export function CategoryFilters({
  brandOptions,
  selectedBrands,
  onToggleBrand,
  optionsPeau,
  selectedPeau,
  onTogglePeau,
  optionsPreoccupation,
  selectedPreoccupation,
  onTogglePreoccupation,
  priceRange,
  onSelectPriceRange,
  minRatings,
  onToggleMinRating,
  inStockOnly,
  onToggleInStockOnly,
  onReset,
  hasActiveFilters,
  namePrefix = "desktop",
  showHeader = true,
}: {
  brandOptions: BrandOption[];
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  optionsPeau: OptionFacette[];
  selectedPeau: string[];
  onTogglePeau: (key: string) => void;
  optionsPreoccupation: OptionFacette[];
  selectedPreoccupation: string[];
  onTogglePreoccupation: (key: string) => void;
  priceRange: string | null;
  onSelectPriceRange: (id: string | null) => void;
  minRatings: number[];
  onToggleMinRating: (rating: number) => void;
  inStockOnly: boolean;
  onToggleInStockOnly: () => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  /**
   * Le composant est rendu deux fois en parallèle — barre latérale sur grand
   * écran, panneau mobile en dessous de « lg » — avec le même état levé dans
   * le parent. Un groupe de boutons radio HTML se distingue par son `name`,
   * pas par sa visibilité : sans préfixe distinct, cocher un prix dans l'une
   * des deux copies décocherait l'autre au niveau du navigateur.
   */
  namePrefix?: string;
  /**
   * Le panneau mobile porte déjà son propre titre « Filtres » dans son en-tête
   * de tiroir : le répéter juste en dessous ferait doublon. Le bouton de
   * réinitialisation reste affiché dans les deux cas, lui seul est utile.
   */
  showHeader?: boolean;
}) {
  const t = useTranslations("category");
  const locale = useLocale();

  return (
    <aside className="w-full shrink-0 lg:w-56 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
      <div className={cn("mb-3 flex items-center", showHeader ? "justify-between" : "justify-end")}>
        {showHeader && (
          <div className="flex items-center gap-2 text-sm font-black text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            {t("filtersTitle")}
          </div>
        )}
        {hasActiveFilters && (
          <button type="button" onClick={onReset} className="text-xs font-semibold text-primary hover:underline">
            {t("filtersReset")}
          </button>
        )}
      </div>

      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t("filterBrand")}
          </legend>
          <ul className="space-y-1.5">
            {brandOptions.map(({ brand, count }) => (
              <li key={brand}>
                <label className="flex items-center justify-between gap-2 text-sm text-foreground">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => onToggleBrand(brand)}
                      className="h-4 w-4 rounded-sm border-border accent-primary"
                    />
                    {brand}
                  </span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {/* Un groupe sans option ne s'affiche pas : une catégorie dont aucun
            produit ne porte de tag de cette famille ne doit pas montrer un
            bloc vide dans les filtres. */}
        {optionsPeau.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {t("filterSkinType")}
            </legend>
            <ul className="space-y-1.5">
              {optionsPeau.map(({ key, label }) => (
                <li key={key}>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedPeau.includes(key)}
                      onChange={() => onTogglePeau(key)}
                      className="h-4 w-4 rounded-sm border-border accent-primary"
                    />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {optionsPreoccupation.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {t("filterConcern")}
            </legend>
            <ul className="space-y-1.5">
              {optionsPreoccupation.map(({ key, label }) => (
                <li key={key}>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedPreoccupation.includes(key)}
                      onChange={() => onTogglePreoccupation(key)}
                      className="h-4 w-4 rounded-sm border-border accent-primary"
                    />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t("filterPrice")}
          </legend>
          <ul className="space-y-1.5">
            {PRICE_RANGES.map((range) => (
              <li key={range.id}>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name={`price-${namePrefix}`}
                    checked={priceRange === range.id}
                    onChange={() => onSelectPriceRange(range.id)}
                    onClick={() => {
                      if (priceRange === range.id) onSelectPriceRange(null);
                    }}
                    className="h-4 w-4 border-border accent-primary"
                  />
                  {t(`priceRanges.${range.id}`)}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t("filterRating")}
          </legend>
          <ul className="space-y-1.5">
            {RATING_THRESHOLDS.map((rating) => (
              <li key={rating}>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={minRatings.includes(rating)}
                    onChange={() => onToggleMinRating(rating)}
                    className="h-4 w-4 rounded-sm border-border accent-primary"
                  />
                  {/* « 4,5 » en français, « 4.5 » en anglais, « 4 » reste « 4 » */}
                  {t("filterMinStars", { rating: rating.toLocaleString(locale) })}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={onToggleInStockOnly}
            className="h-4 w-4 rounded-sm border-border accent-primary"
          />
          {t("filterInStockOnly")}
        </label>
      </div>
    </aside>
  );
}
