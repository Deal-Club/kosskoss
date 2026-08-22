import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { PatternBackdrop } from "@/components/kk/pattern-backdrop";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { getShopBrands } from "@/server/kk/navigation";
import { alternatesFor } from "@/lib/hreflang";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Nos marques — KossKoss Select",
    description:
      "Les maisons distribuées par KossKoss Select : marques dermo-cosmétiques et soins reconnus, achetés par des circuits d'approvisionnement tracés.",
    alternates: alternatesFor("/marques", locale),
  };
}

/**
 * Les maisons distribuées — entrée « Marques » de la structure fournie par le
 * client (bloc de navigation de la maquette).
 *
 * Elle remplace le bandeau de marques qui occupait une bande entière sur
 * l'accueil : nommer les maisons répond à l'inquiétude n°1 de cette clientèle —
 * la contrefaçon — mais cette réponse n'avait pas besoin d'un huitième bloc sur
 * la page d'accueil. Elle a besoin d'une page, atteignable et indexable.
 */
export default async function MarquesPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const brands = await getShopBrands(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-deep text-primary-foreground">
          <PatternBackdrop align="center" />
          <div className="relative mx-auto max-w-3xl px-6 py-14 text-center">
            <p className="eyebrow eyebrow-on-dark">Nos marques</p>
            <h1 className="mt-3">
              {brands.length} maison{brands.length > 1 ? "s" : ""} distribuée
              {brands.length > 1 ? "s" : ""}
            </h1>
            <p className="lead mx-auto mt-4 max-w-xl text-primary-foreground">
              Nous filtrons l&rsquo;offre plutôt que de l&rsquo;empiler. Chaque maison entre au
              catalogue pour ses formules et sa tenue sur les peaux riches en mélanine — et chaque
              référence arrive par un circuit d&rsquo;approvisionnement identifié.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-14">
          {brands.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <li key={brand.name}>
                  {/* `href` absent : mode repli (voir `getShopBrands`), la
                      table `Brand` n'a pas encore été peuplée par l'import.
                      La marque redirige alors vers la recherche, faute de
                      fiche à montrer. */}
                  <Link
                    href={brand.href ?? `/recherche?q=${encodeURIComponent(brand.name)}`}
                    className="kk-lift flex items-center gap-4 rounded-2xl border border-border/70 bg-card px-6 py-5 text-left transition hover:border-deep/40"
                  >
                    {brand.logo ? (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cream">
                        <Image
                          src={brand.logo}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium uppercase tracking-[0.1em] text-deep">
                        {brand.name}
                      </span>
                      {brand.tagline && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {brand.tagline}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground">
              Le catalogue est en cours de chargement.
            </p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
