import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { CatalogView } from "@/components/kk/catalog";
import { getCatalog } from "@/server/kk/catalog";
import { parseBesoin, parseBrands, parsePage, parseSort } from "@/lib/kk/catalog-params";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; group: string; category: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const dynamicParams = true;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { locale, group, category } = await params;
  const page = parsePage((await searchParams).page);
  const view = await getCatalog({ group, category, page, locale });
  if (!view || !view.category) return {};

  // Voir la note de la page univers : chaque page de rayon se désigne
  // elle-même comme canonique, sinon elle n'est jamais explorée.
  const suffixe = view.page > 1 ? ` — Page ${view.page}` : "";
  const requete = view.page > 1 ? `?page=${view.page}` : "";
  return {
    title: `${view.category.label}${suffixe} — ${BRAND.name}`,
    description: `${view.category.label} : notre sélection de soins ${view.category.label.toLowerCase()}, prix en FCFA, livraison au Cameroun.`,
    alternates: alternatesFor(`/${group}/${category}`, locale, requete),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, group, category } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const brands = parseBrands(sp.marque);
  const sort = parseSort(sp.tri);
  const besoin = parseBesoin(sp.besoin);
  const page = parsePage(sp.page);
  const view = await getCatalog({ group, category, brands, besoin, sort, page, locale });
  if (!view) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <CatalogView
          view={view}
          groupSlug={group}
          currentCategory={category}
          brands={brands}
          besoin={besoin}
          sort={sort}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
