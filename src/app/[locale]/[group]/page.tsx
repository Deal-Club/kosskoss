import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, MobileTabBar, SiteFooter } from "@/components/kk/chrome";
import { CatalogView } from "@/components/kk/catalog";
import { getCatalog } from "@/server/kk/catalog";
import { parseBesoin, parseBrands, parseSort } from "@/lib/kk/catalog-params";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; group: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, group } = await params;
  const view = await getCatalog({ group });
  if (!view) return {};
  return {
    title: `${view.group.label} — ${BRAND.name}`,
    description: `Découvrez notre sélection ${view.group.label.toLowerCase()} : soins sélectionnés avec exigence, prix en FCFA, livraison au Cameroun.`,
    alternates: alternatesFor(`/${group}`, locale),
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
  const view = await getCatalog({ group, brands, besoin, sort });
  if (!view) notFound();

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
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
      <MobileTabBar />
    </div>
  );
}
