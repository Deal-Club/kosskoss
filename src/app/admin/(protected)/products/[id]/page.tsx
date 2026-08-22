import { notFound } from "next/navigation";
import { requireCapacitePage } from "@/lib/dal";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductRecord, listCategories } from "@/server/store";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapacitePage("catalogue");
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductRecord(id), listCategories()]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-foreground">Modifier le produit</h1>
      <ProductForm mode="edit" categories={categories} initialData={product} />
    </div>
  );
}
