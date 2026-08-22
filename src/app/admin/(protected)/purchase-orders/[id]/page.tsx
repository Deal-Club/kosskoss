import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapacitePage } from "@/lib/dal";
import { getBon } from "@/server/kk/bons";
import { listProducts } from "@/server/store";
import { PurchaseOrderDetail, type ProductOption } from "@/components/admin/PurchaseOrderDetail";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapacitePage("catalogue");

  const { id } = await params;
  const bon = await getBon(id);
  if (!bon) notFound();

  const produits = await listProducts();
  const options: ProductOption[] = produits.map((produit) => ({
    id: produit.id,
    brand: produit.brand,
    name: produit.name,
    stock: produit.stock ?? 0,
  }));

  return (
    <div>
      <Link href="/admin/purchase-orders" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <div className="mt-2 mb-6" />
      <PurchaseOrderDetail bon={bon} products={options} />
    </div>
  );
}
