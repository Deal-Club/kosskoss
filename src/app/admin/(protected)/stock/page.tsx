import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { StockTable } from "@/components/admin/StockTable";
import { IconActionLink } from "@/components/admin/IconAction";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";
import {
  STOCK_REASON_LABELS,
  isStockReason,
  listLowStockProducts,
  listStockMovements,
  listStockProducts,
} from "@/server/stock";

// Nombre de mouvements chargés avant découpage. `listStockMovements` plafonne
// la valeur à 200 : c'est donc la profondeur maximale de l'historique consultable.
const MOVEMENTS_HISTORY_LIMIT = 200;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reasonLabel(reason: string): string {
  return isStockReason(reason) ? STOCK_REASON_LABELS[reason] : reason;
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mvPage?: string }>;
}) {
  await requireAdminSession();

  // Deux clés distinctes : « page » pour les stocks, « mvPage » pour l'historique.
  const params = await searchParams;
  const stockPage = parsePageParam(params.page);
  const movementsPage = parsePageParam(params.mvPage);

  const [allProducts, lowStock, allMovements] = await Promise.all([
    listStockProducts(),
    listLowStockProducts(),
    listStockMovements({ limit: MOVEMENTS_HISTORY_LIMIT }),
  ]);

  const stockPageInfo = paginate(allProducts, stockPage);
  const movementsPageInfo = paginate(allMovements, movementsPage);
  const movements = movementsPageInfo.items;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Gestion du stock</h1>
        <Link
          href="/admin/products"
          className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
        >
          Voir les produits
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-black text-foreground">Stocks critiques</h2>
        {lowStock.length === 0 ? (
          <p className="rounded-sm border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
            Tous les produits sont au-dessus de leur seuil d&apos;alerte.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-destructive bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Seuil d&apos;alerte</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{product.name}</span>
                      <span className="block text-xs text-muted-foreground">{product.brand}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.categoryLabel}</td>
                    <td className="px-4 py-3">
                      {product.stock <= 0 ? (
                        <span className="rounded-sm bg-destructive px-2 py-1 text-xs font-bold text-white">
                          En rupture
                        </span>
                      ) : (
                        <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.lowStockThreshold}</td>
                    <td className="px-4 py-3 text-right">
                      <IconActionLink
                        href={`/admin/products/${product.id}`}
                        label="Modifier le produit"
                        icon={Pencil}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-black text-foreground">
          Stocks ({stockPageInfo.totalItems} produit{stockPageInfo.totalItems > 1 ? "s" : ""})
        </h2>
        {/* StockTable est un composant client : il ne reçoit que la tranche courante. */}
        <StockTable products={stockPageInfo.items} />
        <AdminPagination
          {...stockPageInfo}
          basePath="/admin/stock"
          params={params}
          label="produits"
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-foreground">Derniers mouvements</h2>
        {movementsPageInfo.totalItems === 0 ? (
          <p className="rounded-sm border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
            Aucun mouvement de stock enregistré pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Quantité</th>
                  <th className="px-4 py-3">Motif</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {movement.productName ?? movement.productId}
                    </td>
                    <td
                      className={
                        movement.delta > 0
                          ? "px-4 py-3 font-black text-foreground"
                          : "px-4 py-3 font-black text-destructive"
                      }
                    >
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {reasonLabel(movement.reason)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{movement.note ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{movement.createdBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination
          {...movementsPageInfo}
          basePath="/admin/stock"
          params={params}
          label="mouvements"
          pageParam="mvPage"
        />
      </section>
    </div>
  );
}
