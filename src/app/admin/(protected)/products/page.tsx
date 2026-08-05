import Link from "next/link";
import { FileSpreadsheet, FileText, Pencil } from "lucide-react";
import { listCategories, listProducts } from "@/server/store";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { IconActionLink } from "@/components/admin/IconAction";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ThumbnailZoom } from "@/components/admin/ThumbnailZoom";
import { paginate, parsePageParam } from "@/lib/pagination";
import {
  SORT_OPTIONS,
  filterAndSortProducts,
  isSortValue,
  type SortValue,
} from "@/server/productListing";

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { categoryId, q, sort } = params;
  const query = (q ?? "").trim();
  const sortValue: SortValue = isSortValue(sort) ? sort : "name";

  const [categories, allProducts] = await Promise.all([
    listCategories(),
    listProducts(categoryId ? { categoryId } : undefined),
  ]);
  const categoryLabelById = new Map(categories.map((category) => [category.id, category.label]));
  // Un produit sans visuel propre affiche celui de sa catégorie, comme sur la boutique.
  const categoryImageById = new Map(categories.map((category) => [category.id, category.image]));

  const sorted = filterAndSortProducts(allProducts, { query, sort: sortValue });

  const pageInfo = paginate(sorted, parsePageParam(params.page));
  const products = pageInfo.items;

  // Les exports reprennent les filtres de l'écran, jamais la pagination :
  // c'est toute la sélection qui part, pas la page affichée.
  const exportParams = new URLSearchParams();
  if (categoryId) exportParams.set("categoryId", categoryId);
  if (query) exportParams.set("q", query);
  if (sortValue !== "name") exportParams.set("sort", sortValue);
  const exportQuery = exportParams.toString();
  const exportHref = (format: "csv" | "pdf") =>
    `/api/admin/products/export?format=${format}${exportQuery ? `&${exportQuery}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Produits</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Téléchargements : des liens simples, pas de navigation client */}
          <a
            href={exportHref("csv")}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </a>
          <a
            href={exportHref("pdf")}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            <FileText className="h-4 w-4" />
            PDF
          </a>
          <Link
            href="/admin/stock"
            className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            Gestion du stock
          </Link>
          <Link
            href="/admin/products/import"
            className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            Importer
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Nouveau produit
          </Link>
        </div>
      </div>

      {/* Un seul formulaire GET : recherche, catégorie et tri restent ensemble dans l'URL */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Recherche</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Marque ou nom"
            className={`${inputClass} w-56`}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Catégorie</span>
          <select name="categoryId" defaultValue={categoryId ?? ""} className={inputClass}>
            <option value="">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Tri</span>
          <select name="sort" defaultValue={sortValue} className={inputClass}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:brightness-125"
        >
          Appliquer
        </button>
        {(query || categoryId || sort) && (
          <Link
            href="/admin/products"
            className="py-2 text-sm font-semibold text-primary hover:underline"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {pageInfo.totalItems === 1 ? "1 produit" : `${pageInfo.totalItems} produits`}
        {query && ` pour « ${query} »`}
      </p>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Marque</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun produit trouvé.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const stock = product.stock ?? 0;
              const threshold = product.lowStockThreshold ?? 0;
              const soldOut = stock <= 0;
              const low = !soldOut && stock <= threshold;

              return (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="py-2 pl-4">
                    <ThumbnailZoom
                      src={product.image?.trim() || categoryImageById.get(product.categoryId) || ""}
                      alt={product.name}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.brand}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {categoryLabelById.get(product.categoryId) ?? product.categoryId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.price}</td>
                  <td className="px-4 py-3">
                    {soldOut ? (
                      <span className="rounded-sm bg-destructive px-2 py-1 text-xs font-bold text-white">
                        En rupture
                      </span>
                    ) : low ? (
                      <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                        {stock} — seuil d&apos;alerte {threshold}
                      </span>
                    ) : (
                      <span className="font-semibold text-foreground">{stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <IconActionLink
                        href={`/admin/products/${product.id}`}
                        label="Modifier"
                        icon={Pencil}
                      />
                      <DeleteButton
                        action={`/api/admin/products/${product.id}`}
                        confirmLabel={`Supprimer définitivement le produit « ${product.name} » ?`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminPagination
        {...pageInfo}
        basePath="/admin/products"
        params={params}
        label="produits"
      />
    </div>
  );
}
