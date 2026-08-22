import { requireCapacitePage } from "@/lib/dal";
import { ProductForm } from "@/components/admin/ProductForm";
import { listCategories } from "@/server/store";
import { listerMarques } from "@/server/kk/marques";

export default async function NewProductPage() {
  await requireCapacitePage("catalogue");
  // Actives seulement : proposer une marque désactivée dans le formulaire de
  // saisie contredirait le geste que ce lot introduit — la masquer de la
  // vitrine — en la remettant aussitôt sous les yeux de qui saisit un produit.
  const [categories, marques] = await Promise.all([
    listCategories(),
    listerMarques({ seulementActives: true }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-foreground">Nouveau produit</h1>
      <ProductForm mode="new" categories={categories} brands={marques} />
    </div>
  );
}
