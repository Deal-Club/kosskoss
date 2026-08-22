import Link from "next/link";
import { requireCapacitePage } from "@/lib/dal";
import { listSuppliers } from "@/server/kk/fournisseurs";
import { PurchaseOrderNewForm } from "@/components/admin/PurchaseOrderNewForm";

export default async function NewPurchaseOrderPage() {
  await requireCapacitePage("catalogue");

  const fournisseurs = (await listSuppliers()).filter((f) => f.active);

  return (
    <div>
      <Link href="/admin/purchase-orders" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Nouveau bon de commande</h1>
      <PurchaseOrderNewForm suppliers={fournisseurs} />
    </div>
  );
}
