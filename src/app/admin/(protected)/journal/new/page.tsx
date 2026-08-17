import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ArticleForm } from "@/components/admin/journal/ArticleForm";
import { listAuthors, listCategories, listTags } from "@/server/journal/taxonomy";

export default async function NewArticlePage() {
  const [categories, tags, authors] = await Promise.all([
    listCategories(),
    listTags(),
    listAuthors(),
  ]);

  return (
    <div>
      <Link
        href="/admin/journal"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour au Journal
      </Link>

      <h1 className="mb-6 text-2xl font-black text-foreground">Nouvel article</h1>

      <ArticleForm article={null} categories={categories} tags={tags} authors={authors} />
    </div>
  );
}
