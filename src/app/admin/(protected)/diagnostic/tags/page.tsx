import type { Metadata } from "next";
import { getProductsForTagging } from "@/server/kk/product-tags";
import { ProductTagsAdmin } from "@/components/admin/ProductTagsAdmin";

export const metadata: Metadata = { title: "Tags produits — Administration" };

export default async function AdminProductTagsPage() {
  const rows = await getProductsForTagging();
  return <ProductTagsAdmin initial={rows} />;
}
