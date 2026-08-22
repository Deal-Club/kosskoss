import { notFound } from "next/navigation";
import { requireCapacitePage } from "@/lib/dal";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductRecord, listCategories } from "@/server/store";
import { listerMarques } from "@/server/kk/marques";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapacitePage("catalogue");
  const { id } = await params;
  // Actives seulement — voir la note de la page de création. Si le produit en
  // cours d'édition est déjà rattaché à une marque désactivée entre-temps,
  // son nom reste affiché dans le champ de saisie libre : seule la liste
  // déroulante des marques proposées à la sélection se filtre.
  const [product, categories, marques] = await Promise.all([
    getProductRecord(id),
    listCategories(),
    listerMarques({ seulementActives: true }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-foreground">Modifier le produit</h1>
      <ProductForm mode="edit" categories={categories} brands={marques} initialData={product} />
    </div>
  );
}
