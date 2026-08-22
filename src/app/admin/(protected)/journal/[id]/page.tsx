import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireCapacitePage } from "@/lib/dal";
import { ArticleForm } from "@/components/admin/journal/ArticleForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getAdminArticle } from "@/server/journal/store";
import { listAuthors, listCategories, listTags } from "@/server/journal/taxonomy";
import { articleViewHistory } from "@/server/journal/counter";

type Params = Promise<{ id: string }>;

export default async function EditArticlePage({ params }: { params: Params }) {
  await requireCapacitePage("contenu");
  const { id } = await params;

  const [article, categories, tags, authors] = await Promise.all([
    getAdminArticle(id),
    listCategories(),
    listTags(),
    listAuthors(),
  ]);

  if (!article) notFound();

  const history = await articleViewHistory(article.id, 30);
  const last30 = history.reduce((total, point) => total + point.count, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/journal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au Journal
        </Link>

        <DeleteButton
          action={`/api/admin/journal/${article.id}`}
          confirmLabel="Mettre cet article à la corbeille ? Il restera récupérable."
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Modifier l&apos;article</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {article.viewCount} vue{article.viewCount > 1 ? "s" : ""} au total
          {last30 > 0 ? ` · ${last30} sur les 30 derniers jours` : ""}
          {article.updatedBy ? ` · dernière modification par ${article.updatedBy}` : ""}
        </p>
      </div>

      <ArticleForm article={article} categories={categories} tags={tags} authors={authors} />
    </div>
  );
}
