import Link from "next/link";
import { requireCapacitePage } from "@/lib/dal";
import { BrandForm } from "@/components/admin/BrandForm";

export default async function NewBrandPage() {
  await requireCapacitePage("catalogue");

  return (
    <div>
      <Link href="/admin/brands" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Nouvelle marque</h1>
      <BrandForm mode="new" />
    </div>
  );
}
