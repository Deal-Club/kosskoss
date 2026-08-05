import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function NewCategoryPage() {
  await requireAdminSession();

  const groups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    select: { slug: true, label: true },
  });

  return (
    <div>
      <Link href="/admin/categories" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Nouvelle catégorie</h1>

      {groups.length === 0 ? (
        <div className="max-w-2xl rounded-sm border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">
            Aucun univers produits n&apos;existe encore. Créez-en un d&apos;abord pour pouvoir y
            rattacher la catégorie.
          </p>
          <Link
            href="/admin/groups/new"
            className="mt-3 inline-block rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Créer un univers
          </Link>
        </div>
      ) : (
        <CategoryForm mode="new" groups={groups} />
      )}
    </div>
  );
}
