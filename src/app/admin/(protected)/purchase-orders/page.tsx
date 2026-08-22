import Link from "next/link";
import { requireCapacitePage } from "@/lib/dal";
import { listBons } from "@/server/kk/bons";
import { listSuppliers } from "@/server/kk/fournisseurs";
import { formatCents } from "@/lib/cart";
import { STATUT_BON_LABELS, type StatutBon } from "@/lib/kk/approvisionnement";

const STATUTS: readonly StatutBon[] = ["brouillon", "envoye", "recu_partiel", "recu", "annule"];

function estStatut(valeur: string | undefined): valeur is StatutBon {
  return valeur !== undefined && (STATUTS as readonly string[]).includes(valeur);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUT_TONE: Record<StatutBon, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoye: "bg-accent text-accent-foreground",
  recu_partiel: "bg-[#b45309]/10 text-[#b45309]",
  recu: "bg-[#16a34a]/10 text-[#16a34a]",
  annule: "bg-destructive/10 text-destructive",
};

export default async function AdminPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; supplierId?: string }>;
}) {
  await requireCapacitePage("catalogue");

  const params = await searchParams;
  const status = estStatut(params.status) ? params.status : undefined;
  const supplierId = params.supplierId || undefined;

  const [bons, fournisseurs] = await Promise.all([
    listBons({ status, supplierId }),
    listSuppliers(),
  ]);

  const totalEngageCents = bons.reduce((somme, bon) => somme + bon.engageCents, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Bons de commande</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bons.length} bon{bons.length > 1 ? "s" : ""} · {formatCents(totalEngageCents)} engagé
            {bons.length > 1 ? "s" : ""} sur cette sélection.
          </p>
        </div>
        <Link
          href="/admin/purchase-orders/new"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Nouveau bon
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Statut</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_BON_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Fournisseur</span>
          <select
            name="supplierId"
            defaultValue={supplierId ?? ""}
            className="rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          >
            <option value="">Tous les fournisseurs</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
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

        {(status || supplierId) && (
          <Link href="/admin/purchase-orders" className="py-2 text-sm font-semibold text-primary hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      {bons.length === 0 ? (
        <div className="rounded-sm border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Aucun bon ne correspond à cette sélection.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Engagé</th>
                <th className="px-4 py-3">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {bons.map((bon) => (
                <tr key={bon.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link href={`/admin/purchase-orders/${bon.id}`} className="hover:underline">
                      {bon.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{bon.supplierName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-sm px-2 py-1 text-xs font-bold ${STATUT_TONE[bon.status]}`}>
                      {STATUT_BON_LABELS[bon.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCents(bon.engageCents)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(bon.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
