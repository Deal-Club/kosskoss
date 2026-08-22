import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { requireCapacitePage } from "@/lib/dal";
import { ArticleView } from "@/components/journal/article-view";
import { getArticleForPreview, listRelatedArticles } from "@/server/journal/read";
import { resolveCitedProducts } from "@/server/journal/products";
import { localizedUrl } from "@/lib/hreflang";
import { ARTICLE_STATUS_LABELS } from "@/types/journal";
import { getAdminArticle } from "@/server/journal/store";
import type { Locale } from "@/i18n/routing";

/**
 * Aperçu d'un article avant publication.
 *
 * Le composant rendu est EXACTEMENT celui de la page publique : un aperçu qui
 * approxime le rendu réel finit toujours par mentir, et c'est précisément le
 * moment où on lui fait confiance.
 *
 * Aucun jeton d'aperçu n'est nécessaire : cette page vit sous
 * `admin/(protected)`, dont le layout garantit déjà la session. La capacité
 * `contenu`, elle, est vérifiée ici — le layout ne connaît que la session, pas
 * le droit sur cet écran.
 */

/**
 * Langue de l'aperçu. Le back-office est francophone : on montre la version
 * française de l'article, celle qui porte le référencement.
 *
 * Cette valeur pilote AUSSI le fournisseur de traductions ci-dessous, et c'est
 * la raison d'être de la constante : les deux ne peuvent plus diverger.
 */
const LOCALE: Locale = "fr";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({ params }: { params: Params }) {
  await requireCapacitePage("contenu");
  const { id } = await params;

  const [article, admin] = await Promise.all([
    getArticleForPreview(id, LOCALE),
    getAdminArticle(id),
  ]);
  if (!article || !admin) notFound();

  const [products, related, messages] = await Promise.all([
    resolveCitedProducts(article.blocks),
    listRelatedArticles(article, LOCALE, 3),
    // Les traductions doivent être chargées ici, explicitement : cette page vit
    // hors du segment [locale], donc hors du layout de la boutique qui monte le
    // fournisseur. Sans elles, le fil d'Ariane d'ArticleView plantait au rendu
    // (« No intl context found ») et l'aperçu renvoyait une 500.
    getMessages({ locale: LOCALE }),
  ]);

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 sm:-my-8">
      {/* Bandeau d'aperçu : impossible de confondre cet écran avec la boutique. */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-deep px-4 py-3 text-white sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/journal/${id}`}
            className="inline-flex items-center gap-1 text-sm font-bold hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour à l&apos;édition
          </Link>
          <span className="rounded-sm bg-white/15 px-2 py-0.5 text-xs font-bold tracking-wide uppercase">
            Aperçu · {ARTICLE_STATUS_LABELS[admin.status]}
          </span>
        </div>

        <p className="text-xs text-white/70">
          {admin.status === "published"
            ? "Cet article est en ligne."
            : "Cet article n'est pas visible sur la boutique."}
        </p>
      </div>

      {/* Le fournisseur n'enveloppe que l'aperçu, pas le bandeau : les 32 Ko de
          traductions de la boutique n'ont rien à faire sur les autres écrans du
          back-office, qui n'en utilisent aucune. */}
      <div className="bg-background">
        <NextIntlClientProvider locale={LOCALE} messages={messages}>
          <ArticleView
            article={article}
            products={products}
            related={related}
            locale={LOCALE}
            shareUrl={localizedUrl(`/journal/${article.slug}`, LOCALE)}
          />
        </NextIntlClientProvider>
      </div>
    </div>
  );
}
