import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { Breadcrumb } from "@/components/Breadcrumb";
import { RecentlyViewedView } from "@/components/RecentlyViewedView";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recentlyViewed" });

  return {
    title: `${t("title")} | KossKoss Select`,
    description: t("emptyText"),
    // La liste vit dans sessionStorage : rien à indexer.
    robots: { index: false, follow: true },
  };
}

export default async function RecentlyViewedPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("recentlyViewed");
  const common = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-screen-xl px-3 py-3">
            <Breadcrumb items={[{ label: common("home"), href: "/" }, { label: t("title") }]} />
          </div>
        </div>

        <div className="mx-auto max-w-screen-xl px-3 py-6">
          <h1 className="mb-1 text-2xl font-black text-foreground">{t("title")}</h1>
          <p className="mb-5 text-sm text-muted-foreground">{t("intro")}</p>
          <RecentlyViewedView />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
