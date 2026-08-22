import { requireCapacitePage } from "@/lib/dal";
import { ProductForm } from "@/components/admin/ProductForm";
import { listCategories } from "@/server/store";

export default async function NewProductPage() {
  await requireCapacitePage("catalogue");
  const categories = await listCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-foreground">Nouveau produit</h1>
      <ProductForm mode="new" categories={categories} />
    </div>
  );
}
