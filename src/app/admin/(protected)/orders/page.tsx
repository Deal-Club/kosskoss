import Link from "next/link";
import { Eye } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { countOrdersByStatus, listOrders } from "@/server/orders";
import {
  ORDER_STATUS_BADGES,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/orderStatus";
import { formatPrice } from "@/server/store";
import { IconActionLink } from "@/components/admin/IconAction";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/lib/pagination";

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; paymentStatus?: string; q?: string; page?: string }>;
}) {
  await requireAdminSession();

  // `params` est conservé entier : il alimente les liens de pagination et fait
  // donc survivre les filtres actifs (statut, recherche, statut de paiement).
  const params = await searchParams;
  const { status, paymentStatus, q } = params;
  const query = (q ?? "").trim();
  const activeStatus = isOrderStatus(status) ? status : undefined;
  const activePaymentStatus = isPaymentStatus(paymentStatus) ? paymentStatus : undefined;

  const [result, counts] = await Promise.all([
    listOrders({
      page: parsePageParam(params.page),
      perPage: ADMIN_PAGE_SIZE,
      status: activeStatus,
      paymentStatus: activePaymentStatus,
      query: query || undefined,
    }),
    countOrdersByStatus(),
  ]);

  // Le découpage est fait en base par `listOrders` : on reconstruit seulement
  // les bornes affichées pour le composant de pagination.
  const offset = (result.page - 1) * result.perPage;
  const pageInfo = {
    page: result.page,
    pageCount: result.pageCount,
    totalItems: result.total,
    firstItem: result.total === 0 ? 0 : offset + 1,
    lastItem: offset + result.orders.length,
  };

  const tabs = [
    { value: undefined, label: `Toutes (${counts.total})`, href: "/admin/orders" },
    ...ORDER_STATUSES.map((entry) => ({
      value: entry,
      label: `${ORDER_STATUS_LABELS[entry].fr} (${counts[entry]})`,
      href: `/admin/orders?status=${entry}`,
    })),
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Commandes</h1>
        {counts.eingegangen > 0 && (
          <span className="rounded-sm bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
            {counts.eingegangen} nouvelle{counts.eingegangen === 1 ? "" : "s"} commande
            {counts.eingegangen === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Chaque commande est archivée avec les prix, adresses et moyen de paiement tels que le client
        les a envoyés. Une annulation recrédite automatiquement la marchandise au stock.
      </p>

      <nav className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value ?? "all"}
            href={tab.href}
            aria-current={activeStatus === tab.value ? "page" : undefined}
            className={`rounded-sm border px-4 py-2 text-sm font-bold ${
              activeStatus === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-foreground hover:border-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Recherche</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="N° de commande, e-mail ou nom"
            className={`${inputClass} w-64`}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Statut de paiement</span>
          <select name="paymentStatus" defaultValue={activePaymentStatus ?? ""} className={inputClass}>
            <option value="">Tous</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label.fr}
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
        {(query || activePaymentStatus) && (
          <Link href="/admin/orders" className="py-2 text-sm font-semibold text-primary hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {pageInfo.totalItems === 1 ? "1 commande" : `${pageInfo.totalItems} commandes`}
        {query && ` pour « ${query} »`}
      </p>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut commande</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune commande trouvée.
                </td>
              </tr>
            )}
            {result.orders.map((order) => {
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-bold text-foreground hover:text-primary"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {dateFormatter.format(new Date(order.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-foreground">
                      {order.billing.firstName} {order.billing.lastName}
                    </span>
                    <span className="block text-xs text-muted-foreground">{order.email}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{itemCount}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap text-foreground">
                    {formatPrice(order.totalCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-1 text-xs font-bold ${ORDER_STATUS_BADGES[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status].fr}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-1 text-xs font-bold ${PAYMENT_STATUS_BADGES[order.paymentStatus]}`}
                    >
                      {PAYMENT_STATUS_LABELS[order.paymentStatus].fr}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {order.paymentMethodLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <IconActionLink
                        href={`/admin/orders/${order.id}`}
                        label="Voir la commande"
                        icon={Eye}
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
        basePath="/admin/orders"
        params={params}
        label="commandes"
      />
    </div>
  );
}
