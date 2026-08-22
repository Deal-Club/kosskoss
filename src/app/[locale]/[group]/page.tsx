import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { CatalogView } from "@/components/kk/catalog";
import { getCatalog } from "@/server/kk/catalog";
import { parseBesoin, parseBrands, parsePage, parseSort } from "@/lib/kk/catalog-params";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; group: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const dynamicParams = true;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { locale, group } = await params;
  const page = parsePage((await searchParams).page);
  const view = await getCatalog({ group, page, locale });
  if (!view) return {};

  const t = await getTranslations({ locale, namespace: "catalog" });

  // Une page 2 doit porter son propre titre et sa propre canonique.
  // Sans ça, Google voit deux adresses au contenu différent sous un
  // même titre et une même canonique : il replie la seconde sur la
  // première et n'explore jamais les produits qu'elle seule montre.
  const suffixe = view.page > 1 ? ` — Page ${view.page}` : "";
  const requete = view.page > 1 ? `?page=${view.page}` : "";
  return {
    title: `${view.group.label}${suffixe} — ${BRAND.name}`,
    description: t("metaDescription", { labelLower: view.group.label.toLowerCase() }),
    alternates: alternatesFor(`/${group}`, locale, requete),
  };
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, group } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const brands = parseBrands(sp.marque);
  const sort = parseSort(sp.tri);
  const besoin = parseBesoin(sp.besoin);
  const page = parsePage(sp.page);
  const view = await getCatalog({ group, brands, besoin, sort, page, locale });
  if (!view) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <CatalogView
          view={view}
          groupSlug={group}
          brands={brands}
          besoin={besoin}
          sort={sort}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
