import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { getCategoryRecord } from "@/server/store";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  await requireAdminSession();

  const { id } = await params;
  const [category, groups] = await Promise.all([
    getCategoryRecord(id.join("/")),
    prisma.group.findMany({ orderBy: { position: "asc" }, select: { slug: true, label: true } }),
  ]);
  if (!category) notFound();

  return (
    <div>
      <Link href="/admin/categories" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Modifier la catégorie</h1>
        <Link
          href={`/admin/products?categoryId=${category.id}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Voir les produits de cette catégorie
        </Link>
      </div>
      <CategoryForm mode="edit" groups={groups} initialData={category} />
    </div>
  );
}
