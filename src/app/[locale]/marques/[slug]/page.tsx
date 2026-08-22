import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { PatternBackdrop } from "@/components/kk/pattern-backdrop";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { ProductCard } from "@/components/kk/product-card";
import { marqueVitrineParSlug } from "@/server/kk/marques";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const marque = await marqueVitrineParSlug(slug, locale);
  if (!marque) return { title: `Marque introuvable — ${BRAND.name}` };

  return {
    title: `${marque.name} — ${BRAND.name}`,
    description: marque.description
      ? marque.description.slice(0, 155)
      : `Les produits ${marque.name} chez ${BRAND.name}.`,
    alternates: alternatesFor(`/marques/${marque.slug}`, locale),
  };
}

/**
 * Page d'une marque.
 *
 * C'est la page qui n'existait pas : un visiteur qui cherche une maison
 * précise n'avait nulle part où aller, alors que c'est un chemin d'entrée
 * naturel en cosmétique (§2.3 de la spécification du lot).
 *
 * `marqueVitrineParSlug` rend `null` — et donc une 404 ici — pour une marque
 * inexistante, inactive, ou qui n'a plus aucun produit actif : une fiche vide
 * déçoit plus qu'une absence, et sortir la page du référencement vaut mieux
 * que d'y laisser une grille vide.
 */
export default async function MarquePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const marque = await marqueVitrineParSlug(slug, locale);
  if (!marque) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1">
        <nav aria-label="Fil d'Ariane" className="mx-auto max-w-7xl px-6 py-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Link href="/" className="transition hover:text-deep">
                Accueil
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="flex items-center gap-1.5">
              <Link href="/marques" className="transition hover:text-deep">
                Marques
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="text-deep">{marque.name}</li>
          </ol>
        </nav>

        <section className="relative overflow-hidden bg-deep text-primary-foreground">
          <PatternBackdrop align="center" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-14 text-center">
            {marque.logo && (
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
                <Image
                  src={marque.logo}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain p-2"
                  unoptimized
                />
              </span>
            )}
            <p className="eyebrow eyebrow-on-dark">Marque</p>
            <h1>{marque.name}</h1>
            {marque.description && (
              <p className="lead mx-auto max-w-xl text-primary-foreground">{marque.description}</p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14">
          <p className="eyebrow">
            {marque.products.length} produit{marque.products.length > 1 ? "s" : ""}
          </p>
          <h2 className="mt-2 text-deep">Le rayon {marque.name}</h2>

          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-3">
            {marque.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
