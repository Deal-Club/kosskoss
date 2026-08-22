import Link from "next/link";
import { requireCapacitePage } from "@/lib/dal";
import { SupplierForm } from "@/components/admin/SupplierForm";

export default async function NewSupplierPage() {
  await requireCapacitePage("catalogue");

  return (
    <div>
      <Link href="/admin/suppliers" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Nouveau fournisseur</h1>
      <SupplierForm mode="new" />
    </div>
  );
}
