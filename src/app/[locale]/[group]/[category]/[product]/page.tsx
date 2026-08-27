import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { ProductDetail } from "@/components/kk/product-detail";
import { getProductDetail, getRelatedProducts } from "@/server/kk/product";
import { getProductReviews } from "@/server/kk/product-reviews";
import { alternatesFor } from "@/lib/hreflang";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type ProductParams = Promise<{
  locale: Locale;
  group: string;
  category: string;
  product: string;
}>;

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: ProductParams }): Promise<Metadata> {
  const { locale, group, category, product } = await params;
  const detail = await getProductDetail(group, category, product, locale);
  if (!detail) return {};
  return {
    title: `${detail.brand} ${detail.name} · ${BRAND.name}`,
    description: detail.shortDescription || detail.bullets.join(" · "),
    alternates: alternatesFor(`/${group}/${category}/${product}`, locale),
  };
}

export default async function ProductPage({ params }: { params: ProductParams }) {
  const { locale, group, category, product } = await params;
  setRequestLocale(locale);

  const detail = await getProductDetail(group, category, product, locale);
  if (!detail) notFound();

  const [related, reviews] = await Promise.all([
    getRelatedProducts(detail.category.slug, detail.id, locale, 4),
    // Seuls les avis modérés sortent d'ici — voir getProductReviews.
    getProductReviews(detail.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <ProductDetail product={detail} related={related} reviews={reviews} />
      </main>
      <SiteFooter />
    </div>
  );
}
