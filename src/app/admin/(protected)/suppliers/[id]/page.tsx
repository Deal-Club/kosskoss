import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapacitePage } from "@/lib/dal";
import { getSupplier } from "@/server/kk/fournisseurs";
import { SupplierForm } from "@/components/admin/SupplierForm";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapacitePage("catalogue");

  const { id } = await params;
  const fournisseur = await getSupplier(id);
  if (!fournisseur) notFound();

  return (
    <div>
      <Link href="/admin/suppliers" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Modifier le fournisseur</h1>
      <SupplierForm mode="edit" initialData={fournisseur} />
    </div>
  );
}
