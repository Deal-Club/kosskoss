import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { listCustomersForAdmin } from "@/server/customers";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ADMIN_PAGE_SIZE, paginate, parsePageParam } from "@/lib/pagination";

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const SALUTATION_LABELS: Record<string, string> = {
  herr: "M.",
  frau: "Mme",
  divers: "Divers",
};

/**
 * Liste des comptes clients de la boutique.
 *
 * Lecture seule : le back-office ne modifie ni ne supprime un compte client.
 * La suppression relève du droit à l'effacement, que le client exerce lui-même
 * depuis son espace — c'est aussi ce qui garantit qu'elle s'accompagne de
 * l'anonymisation des commandes.
 *
 * Aucun mot de passe, même haché, n'est chargé par cette page.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminSession();

  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const customers = await listCustomersForAdmin(query || undefined);
  const page = paginate(customers, parsePageParam(params.page), ADMIN_PAGE_SIZE);

  const activeCount = customers.filter((customer) => customer.active).length;
  const withOrders = customers.filter((customer) => customer.orderCount > 0).length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-black text-foreground">Clients</h1>
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Comptes créés depuis la boutique. Le compte est facultatif : une bonne partie des
        commandes reste passée en tant qu&apos;invité et n&apos;apparaît donc pas ici. Un client
        supprime son compte lui-même depuis « Mes données » ; ses commandes sont alors
        conservées mais détachées et anonymisées, conformément aux délais de conservation
        comptables.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Comptes" value={customers.length} />
        <StatCard label="Comptes actifs" value={activeCount} />
        <StatCard label="Ayant commandé" value={withOrders} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Recherche</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Nom, e-mail ou ville"
            className={`${inputClass} w-64`}
          />
        </label>
        <button
          type="submit"
          className="rounded-sm bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:brightness-125"
        >
          Appliquer
        </button>
        {query && (
          <Link
            href="/admin/customers"
            className="py-2 text-sm font-semibold text-primary hover:underline"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {page.totalItems === 1 ? "1 client" : `${page.totalItems} clients`}
        {query && ` pour « ${query} »`}
      </p>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">Inscription</th>
              <th className="px-4 py-3">Dernière connexion</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {page.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
            {page.items.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {SALUTATION_LABELS[customer.salutation]
                    ? `${SALUTATION_LABELS[customer.salutation]} `
                    : ""}
                  {customer.firstName} {customer.lastName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{customer.city || "—"}</td>
                <td className="px-4 py-3">
                  {customer.orderCount > 0 ? (
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(customer.email)}`}
                      className="font-bold text-foreground hover:text-primary"
                    >
                      {customer.orderCount}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {dateFormatter.format(new Date(customer.createdAt))}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {customer.lastLoginAt
                    ? dateFormatter.format(new Date(customer.lastLoginAt))
                    : "jamais"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-sm px-2 py-1 text-xs font-bold ${
                      customer.active
                        ? "bg-[#16a34a] text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {customer.active ? "Actif" : "Désactivé"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        {...page}
        basePath="/admin/customers"
        params={params}
        label="clients"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border bg-white px-4 py-3">
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}
