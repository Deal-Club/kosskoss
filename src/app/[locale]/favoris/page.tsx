import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { WishlistView } from "@/components/wishlist/WishlistView";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wishlist" });

  return {
    title: `${t("title")} | MLC Bois`,
    description: t("emptyText"),
    // La liste vit dans le navigateur : rien à indexer.
    robots: { index: false, follow: true },
  };
}

export default async function WishlistPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("wishlist");
  const common = await getTranslations("common");

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-screen-xl px-3 py-3">
            <Breadcrumb items={[{ label: common("home"), href: "/" }, { label: t("title") }]} />
          </div>
        </div>

        <div className="mx-auto max-w-screen-xl px-3 py-6">
          <h1 className="mb-1 text-2xl font-black text-foreground">{t("title")}</h1>
          <p className="mb-5 text-sm text-muted-foreground">{t("intro")}</p>
          <WishlistView />
        </div>
      </main>
      <Footer />
    </>
  );
}
