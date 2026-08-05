import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { ProductImportForm } from "@/components/admin/ProductImportForm";
import { listCategories } from "@/server/store";

export default async function ProductImportPage() {
  await requireAdminSession();
  const categories = await listCategories();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Importer des produits</h1>
        <Link
          href="/admin/products"
          className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
        >
          Retour à la liste
        </Link>
      </div>

      <section className="mb-6 rounded-sm border border-border bg-white p-5 text-sm">
        <h2 className="mb-2 font-black text-foreground">Format attendu</h2>
        <p className="mb-3 text-muted-foreground">
          CSV avec point-virgule comme séparateur et une ligne d&apos;en-tête. Les caractéristiques
          sont séparées par une barre verticale. Les colonnes vides restent vides. Vous pouvez aussi
          coller un tableau JSON avec les mêmes noms de champs.
        </p>
        <pre className="mb-3 overflow-x-auto rounded-sm bg-muted px-3 py-2 font-mono text-xs text-foreground">
          categoryId;brand;name;price;oldPrice;badge;bullets;shortDescription;stock
        </pre>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">categoryId</span> — catégorie au format
            « univers/slug », voir la liste ci-dessous.
          </li>
          <li>
            <span className="font-semibold text-foreground">price / oldPrice</span> — format
            français, ex. 1 399,00 €.
          </li>
          <li>
            <span className="font-semibold text-foreground">bullets</span> — caractéristiques
            séparées par |, ex. 9 kg|EcoSilence Drive|AquaStop.
          </li>
          <li>
            <span className="font-semibold text-foreground">shortDescription</span> — 200 caractères
            maximum.
          </li>
          <li>
            <span className="font-semibold text-foreground">stock</span> — nombre entier à partir de
            0 ; sans valeur, le stock par défaut est utilisé.
          </li>
        </ul>

        <h3 className="mb-2 font-black text-foreground">Catégories disponibles</h3>
        <div className="max-h-40 overflow-y-auto rounded-sm border border-border">
          <table className="w-full text-left text-xs">
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-mono text-foreground">{category.id}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{category.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ProductImportForm
        categories={categories.map((category) => ({ id: category.id, label: category.label }))}
      />
    </div>
  );
}
