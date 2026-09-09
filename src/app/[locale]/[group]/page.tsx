import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { CatalogView } from "@/components/kk/catalog";
import { RoutineCard } from "@/components/kk/routine-card";
import { getCatalog, getCatalogMeta } from "@/server/kk/catalog";
import { getRoutinesByBesoin } from "@/server/kk/routines";
import { lireVocabulaire } from "@/server/kk/vocabulaire-tags";
import { parseBrands, parseFacettes, parsePage, parsePrix, parseSort } from "@/lib/kk/catalog-params";
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
  const view = await getCatalogMeta({ group, page, locale });
  if (!view) return {};

  const t = await getTranslations({ locale, namespace: "catalog" });

  // Une page 2 doit porter son propre titre et sa propre canonique.
  // Sans ça, Google voit deux adresses au contenu différent sous un
  // même titre et une même canonique : il replie la seconde sur la
  // première et n'explore jamais les produits qu'elle seule montre.
  const suffixe = view.page > 1 ? ` · Page ${view.page}` : "";
  const requete = view.page > 1 ? `?page=${view.page}` : "";
  return {
    title: `${view.group.label}${suffixe} · ${BRAND.name}`,
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
  // Le vocabulaire est lu D'ABORD : `parseFacettes` en a besoin pour router
  // un `besoin` hérité vers la bonne famille (voir catalog-params.ts). Il est
  // mémoïsé par `cache()` - le second appel, à l'intérieur de `getCatalog`,
  // ne coûte donc pas de requête supplémentaire.
  const vocabulaire = await lireVocabulaire(locale);
  // `besoin` - l'ancien paramètre à choix unique - est versé dans la bonne
  // famille par `parseFacettes` : un lien de diagnostic ou un lien déjà
  // partagé continue de filtrer correctement (voir catalog-params.ts).
  const selection = parseFacettes({ peau: sp.peau, preoccupation: sp.preoccupation, besoin: sp.besoin }, vocabulaire);
  const prix = parsePrix({ prixMin: sp.prixMin, prixMax: sp.prixMax });
  const page = parsePage(sp.page);
  // Les routines dédiées à l'univers, quand son slug est aussi un besoin de
  // routine (`Routine.besoinTag`) : « homme » aujourd'hui, et tout univers
  // futur qui porterait une gamme dédiée. Ailleurs, la liste revient vide et
  // le bloc ne se rend pas. Lancée en parallèle du catalogue.
  const [view, routinesUnivers] = await Promise.all([
    getCatalog({
      group,
      brands,
      peau: selection.peau,
      preoccupation: selection.preoccupation,
      prixMin: prix.min,
      prixMax: prix.max,
      sort,
      page,
      locale,
    }),
    getRoutinesByBesoin(group, locale),
  ]);
  if (!view) notFound();

  const t = await getTranslations({ locale, namespace: "catalog" });
  const spotlight =
    routinesUnivers.length > 0 ? (
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="rounded-[1.75rem] bg-sand/60 p-7 sm:p-9">
          <p className="eyebrow">{t("routinesSpotlightEyebrow")}</p>
          <h2 className="mt-2 text-deep">
            {t("routinesSpotlightTitle", { label: view.group.label })}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {routinesUnivers.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}
          </div>
        </div>
      </section>
    ) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <CatalogView
          view={view}
          groupSlug={group}
          brands={brands}
          selection={selection}
          prix={prix}
          sort={sort}
          vocabulaire={vocabulaire}
          locale={locale}
          spotlight={spotlight}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
