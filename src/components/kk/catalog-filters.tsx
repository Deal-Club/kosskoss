import type { getTranslations } from "next-intl/server";
import { Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { LocalizedLink as Link } from "./localized-link";
import type { CatalogView, CatalogSort } from "@/server/kk/catalog";
import { FAMILLE_PEAU, FAMILLE_PREOCCUPATION, type OptionFacette } from "@/lib/kk/facettes";
import { formatFcfa } from "@/lib/kk/format";
import type { Locale } from "@/i18n/routing";

type CatalogT = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Composant de facettes du catalogue : panneau de filtres (catégorie, marque,
 * type de peau, préoccupation, prix, tri) et résumé des filtres actifs.
 *
 * Extrait de `catalog.tsx` — quatre blocs de facettes plus la barre de filtres
 * actifs auraient rendu ce fichier illisible mêlés au reste de la mise en page
 * du rayon (hero, grille, pagination).
 */

/** Sélection de filtres portée par l'URL, hors page et hors catégorie. */
export type CatalogFilterState = {
  brands: string[];
  peau: string[];
  preoccupation: string[];
  prixMin?: number;
  prixMax?: number;
  sort: CatalogSort;
};

/** Ajoute ou retire une clé d'une liste — la case à cocher en union. */
export function toggled(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/**
 * URL d'un état du rayon : filtres, tri, page.
 *
 * La page n'est PAS reportée par les liens de filtre ou de tri, et c'est
 * voulu : changer un filtre depuis la page 3 doit ramener page 1, sinon on
 * atterrit sur une grille vide quand le nouveau filtre rend moins de trois
 * pages. Seuls les liens de pagination passent `page`.
 *
 * Un `?besoin=` hérité n'est jamais reconstruit ici : une fois la sélection
 * lue (voir `parseFacettes`), elle vit dans `peau`/`preoccupation` comme
 * n'importe quelle autre facette. C'est la migration voulue — un ancien lien
 * continue de filtrer correctement, mais tout nouveau lien généré depuis
 * l'écran s'exprime dans le vocabulaire actuel.
 */
export function withParams(basePath: string, state: CatalogFilterState, page?: number): string {
  const sp = new URLSearchParams();
  if (state.brands.length) sp.set("marque", state.brands.join(","));
  if (state.peau.length) sp.set("peau", state.peau.join(","));
  if (state.preoccupation.length) sp.set("preoccupation", state.preoccupation.join(","));
  if (state.prixMin !== undefined) sp.set("prixMin", String(state.prixMin));
  if (state.prixMax !== undefined) sp.set("prixMax", String(state.prixMax));
  if (state.sort !== "pertinence") sp.set("tri", state.sort);
  // La page 1 reste l'URL nue : deux adresses pour une même grille dilueraient
  // le référencement du rayon.
  if (page && page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Nombre de filtres actifs — le prix compte pour un, quelle que soit la borne posée. */
export function activeFilterCount(state: CatalogFilterState): number {
  return (
    state.brands.length +
    state.peau.length +
    state.preoccupation.length +
    (state.prixMin !== undefined || state.prixMax !== undefined ? 1 : 0)
  );
}

function hasActiveFilters(state: CatalogFilterState): boolean {
  return activeFilterCount(state) > 0 || state.sort !== "pertinence";
}

const SORT_KEYS: { key: CatalogSort; labelKey: "sortRelevance" | "sortNewest" | "sortPriceAsc" | "sortPriceDesc" }[] = [
  { key: "pertinence", labelKey: "sortRelevance" },
  { key: "nouveautes", labelKey: "sortNewest" },
  { key: "prix-asc", labelKey: "sortPriceAsc" },
  { key: "prix-desc", labelKey: "sortPriceDesc" },
];

/**
 * Une case à cocher pour une option de facette (marque, type de peau,
 * préoccupation), avec son décompte.
 *
 * Une option à zéro se DÉSACTIVE plutôt que de disparaître : une case qui
 * s'évapore fait douter de ce qu'on a coché. Une option déjà cochée reste
 * toujours cliquable pour pouvoir la décocher, même si son décompte marginal
 * — qui ignore volontairement toute sa famille, voir `getCatalog` — tombe à
 * zéro : sans quoi décocher une case redevenue « à zéro » serait impossible.
 */
function FacetOptionRow({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  const box = (
    <span
      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
        active ? "border-deep bg-deep text-primary-foreground" : "border-border bg-cream"
      }`}
    >
      {active && <Check className="h-3 w-3" />}
    </span>
  );

  if (!active && count === 0) {
    return (
      <span aria-disabled="true" className="flex cursor-not-allowed items-center gap-2.5 text-sm text-muted-foreground/50">
        {box}
        <span className="flex-1">{label}</span>
        <span>({count})</span>
      </span>
    );
  }

  return (
    <Link href={href} className="flex items-center gap-2.5 text-sm text-foreground transition hover:text-deep">
      {box}
      <span className="flex-1">{label}</span>
      <span className="text-muted-foreground">({count})</span>
    </Link>
  );
}

export function FiltersPanel({
  view,
  groupSlug,
  currentCategory,
  state,
  basePath,
  vocabulaire,
  locale,
  t,
  idPrefix,
}: {
  view: CatalogView;
  groupSlug: string;
  currentCategory?: string;
  state: CatalogFilterState;
  basePath: string;
  vocabulaire: OptionFacette[];
  locale: Locale;
  t: CatalogT;
  /**
   * Préfixe des identifiants de champ. Le panneau est rendu deux fois sur
   * la même page — repliable au mobile, fixe au bureau — et un même `id`
   * posé deux fois casse l'association `<label for>` : le clic sur une
   * étiquette de prix visait alors toujours le PREMIER champ du DOM, jamais
   * celui réellement affiché à l'écran. `groupSlug`/`currentCategory`
   * suffiraient à rendre les deux instances différentes, mais un simple
   * "mobile"/"desktop" explicite à l'appel (voir catalog.tsx) documente
   * mieux l'intention qu'un slug de rayon.
   */
  idPrefix: string;
}) {
  const peauOptions = vocabulaire.filter((o) => o.family === FAMILLE_PEAU);
  const preoccupationOptions = vocabulaire.filter((o) => o.family === FAMILLE_PREOCCUPATION);
  // Le français vit à la racine, l'anglais sous /en (voir src/i18n/routing.ts) :
  // le formulaire de prix soumet en GET natif, hors contexte next-intl, il
  // doit donc préfixer lui-même sa destination.
  const localePrefix = locale === "en" ? "/en" : "";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-deep">
          <SlidersHorizontal className="h-4 w-4" /> {t("filtersTitle")}
        </h2>
        {hasActiveFilters(state) && (
          <Link href={basePath} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-deep">
            <RotateCcw className="h-3 w-3" /> {t("reset")}
          </Link>
        )}
      </div>

      {/* Catégorie */}
      <div>
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("categoryLabel")}
        </h3>
        <ul className="mt-3 space-y-1.5">
          <li>
            <Link
              href={`/${groupSlug}`}
              className={`text-sm transition hover:text-deep ${!currentCategory ? "font-semibold text-deep" : "text-foreground"}`}
            >
              {t("allProducts")}
            </Link>
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
                <Link
                  href={`/${groupSlug}/${c.slug}`}
                  className={`block text-sm transition hover:text-deep ${active ? "font-semibold text-deep" : "text-foreground"}`}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Marque */}
      {view.brands.length > 0 && (
        <div>
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("brandLabel")}
          </h3>
          <ul className="mt-3 space-y-1.5">
            {view.brands.map((b) => {
              const active = state.brands.includes(b);
              const href = withParams(basePath, { ...state, brands: toggled(state.brands, b) });
              return (
                <li key={b}>
                  <FacetOptionRow label={b} count={view.countsByBrand[b] ?? 0} active={active} href={href} />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Type de peau */}
      {peauOptions.length > 0 && (
        <div>
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("skinTypeLabel")}
          </h3>
          <ul className="mt-3 space-y-1.5">
            {peauOptions.map((opt) => {
              const active = state.peau.includes(opt.key);
              const href = withParams(basePath, { ...state, peau: toggled(state.peau, opt.key) });
              return (
                <li key={opt.key}>
                  <FacetOptionRow label={opt.label} count={view.countsByPeau[opt.key] ?? 0} active={active} href={href} />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Préoccupation */}
      {preoccupationOptions.length > 0 && (
        <div>
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("concernLabel")}
          </h3>
          <ul className="mt-3 space-y-1.5">
            {preoccupationOptions.map((opt) => {
              const active = state.preoccupation.includes(opt.key);
              const href = withParams(basePath, { ...state, preoccupation: toggled(state.preoccupation, opt.key) });
              return (
                <li key={opt.key}>
                  <FacetOptionRow
                    label={opt.label}
                    count={view.countsByPreoccupation[opt.key] ?? 0}
                    active={active}
                    href={href}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Prix — borne, ne trie pas : le tri par prix reste un bloc séparé. */}
      <div>
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("priceLabel")}
        </h3>
        <form action={`${localePrefix}${basePath}`} method="GET" className="mt-3 space-y-2.5">
          {state.brands.length > 0 && <input type="hidden" name="marque" value={state.brands.join(",")} />}
          {state.peau.length > 0 && <input type="hidden" name="peau" value={state.peau.join(",")} />}
          {state.preoccupation.length > 0 && (
            <input type="hidden" name="preoccupation" value={state.preoccupation.join(",")} />
          )}
          {state.sort !== "pertinence" && <input type="hidden" name="tri" value={state.sort} />}
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`${idPrefix}-prixMin`}>
              {t("priceMinLabel")}
            </label>
            <input
              id={`${idPrefix}-prixMin`}
              type="number"
              inputMode="numeric"
              name="prixMin"
              min={0}
              // Ceinture ET bretelles : ce plafond n'empêche pas à lui seul une
              // borne absurde (contournable en DevTools ou par requête directe),
              // c'est `parseBorne` qui la tient réellement (voir
              // catalog-params.ts) — mais il évite déjà, pour un visiteur qui
              // tape dans le champ, de viser un prix qu'aucun produit du rayon
              // n'atteint.
              max={view.prixMax}
              step={100}
              defaultValue={state.prixMin ?? ""}
              placeholder={String(view.prixMin)}
              className="w-full min-w-0 rounded-lg border border-border bg-cream px-2.5 py-1.5 text-sm text-foreground"
            />
            <span aria-hidden="true" className="text-muted-foreground">
              –
            </span>
            <label className="sr-only" htmlFor={`${idPrefix}-prixMax`}>
              {t("priceMaxLabel")}
            </label>
            <input
              id={`${idPrefix}-prixMax`}
              type="number"
              inputMode="numeric"
              name="prixMax"
              min={0}
              max={view.prixMax}
              step={100}
              defaultValue={state.prixMax ?? ""}
              placeholder={String(view.prixMax)}
              className="w-full min-w-0 rounded-lg border border-border bg-cream px-2.5 py-1.5 text-sm text-foreground"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg border border-border py-1.5 text-xs font-semibold uppercase tracking-wide text-deep transition hover:bg-cream"
          >
            {t("priceApply")}
          </button>
        </form>
      </div>

      {/* Tri */}
      <div>
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("sortLabel")}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {SORT_KEYS.map((s) => {
            const active = s.key === state.sort;
            return (
              <li key={s.key}>
                <Link
                  href={withParams(basePath, { ...state, sort: s.key })}
                  className={`text-sm transition hover:text-deep ${active ? "font-semibold text-deep" : "text-foreground"}`}
                >
                  {t(s.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * Repli d'affichage pour une clé de facette dont le vocabulaire ne porte plus
 * le libellé (tag retiré depuis, lien déjà partagé) : « peau_normale » devient
 * « Peau normale » plutôt que de s'afficher tel quel, en argot de base de
 * données, dans une puce destinée à un visiteur.
 */
function humaniser(cle: string): string {
  const mots = cle.replace(/[_-]+/g, " ").trim();
  if (!mots) return cle;
  return mots.charAt(0).toUpperCase() + mots.slice(1);
}

/** Libellé d'une clé de facette — repli humanisé si le vocabulaire ne la porte plus. */
function labelFor(vocabulaire: OptionFacette[], key: string): string {
  return vocabulaire.find((o) => o.key === key)?.label ?? humaniser(key);
}

/** Libellé d'une borne de prix posée, entière ou partielle. */
function priceChipLabel(t: CatalogT, prixMin?: number, prixMax?: number): string {
  if (prixMin !== undefined && prixMax !== undefined) {
    return t("priceBetween", { min: formatFcfa(prixMin), max: formatFcfa(prixMax) });
  }
  if (prixMin !== undefined) return t("priceFrom", { value: formatFcfa(prixMin) });
  return t("priceUpTo", { value: formatFcfa(prixMax as number) });
}

/**
 * Résumé des filtres actifs — marque, type de peau, préoccupation, prix —
 * chacun retirable individuellement, plus un « tout effacer ». Le tri n'y
 * figure pas : ce n'est pas un filtre, il ne restreint aucun produit.
 */
export function ActiveFilters({
  state,
  vocabulaire,
  basePath,
  t,
}: {
  state: CatalogFilterState;
  vocabulaire: OptionFacette[];
  basePath: string;
  t: CatalogT;
}) {
  const chips: { key: string; label: string; href: string }[] = [];

  for (const b of state.brands) {
    chips.push({
      key: `marque-${b}`,
      label: b,
      href: withParams(basePath, { ...state, brands: state.brands.filter((x) => x !== b) }),
    });
  }
  for (const p of state.peau) {
    chips.push({
      key: `peau-${p}`,
      label: labelFor(vocabulaire, p),
      href: withParams(basePath, { ...state, peau: state.peau.filter((x) => x !== p) }),
    });
  }
  for (const p of state.preoccupation) {
    chips.push({
      key: `preoccupation-${p}`,
      label: labelFor(vocabulaire, p),
      href: withParams(basePath, { ...state, preoccupation: state.preoccupation.filter((x) => x !== p) }),
    });
  }
  if (state.prixMin !== undefined || state.prixMax !== undefined) {
    chips.push({
      key: "prix",
      label: priceChipLabel(t, state.prixMin, state.prixMax),
      href: withParams(basePath, { ...state, prixMin: undefined, prixMax: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">{t("activeFiltersTitle")}</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-cream px-3 py-1 text-xs font-medium text-deep transition hover:bg-border/40"
        >
          {chip.label}
          <X className="h-3 w-3 opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
          <span className="sr-only">{t("removeFilter")}</span>
        </Link>
      ))}
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 text-xs font-semibold text-deep underline underline-offset-4 hover:text-deep/70"
      >
        {t("clearAllFilters")}
      </Link>
    </div>
  );
}
