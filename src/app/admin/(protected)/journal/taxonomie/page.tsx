import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TaxonomyManager } from "@/components/admin/journal/TaxonomyManager";
import { listAuthors, listCategories, listTags } from "@/server/journal/taxonomy";

export default async function JournalTaxonomyPage() {
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

      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Rubriques, tags &amp; auteurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces trois classements organisent le Journal et décident de ce qui est indexé : une
          rubrique vide et un tag utilisé une seule fois restent hors du sitemap.
        </p>
      </div>

      <TaxonomyManager categories={categories} tags={tags} authors={authors} />
    </div>
  );
}
