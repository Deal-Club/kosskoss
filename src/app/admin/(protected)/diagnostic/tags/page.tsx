import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { getProductsForTagging } from "@/server/kk/product-tags";
import { lireVocabulaireAdmin } from "@/server/kk/vocabulaire-tags";
import { ProductTagsAdmin } from "@/components/admin/ProductTagsAdmin";

export const metadata: Metadata = { title: "Tags produits — Administration" };

export default async function AdminProductTagsPage() {
  await requireCapacitePage("catalogue");
  // Le vocabulaire est lu ici, et non figé dans le composant client : cet écran
  // sert de mémo à l'opérateur qui saisit des tags à la main, il doit donc
  // refléter ce que /admin/products/tags contient réellement.
  const [rows, vocabulaire] = await Promise.all([
    getProductsForTagging(),
    lireVocabulaireAdmin(),
  ]);
  return <ProductTagsAdmin initial={rows} vocabulaire={vocabulaire} />;
}
