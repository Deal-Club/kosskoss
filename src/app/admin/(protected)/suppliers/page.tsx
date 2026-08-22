import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireCapacitePage } from "@/lib/dal";
import { listSuppliers } from "@/server/kk/fournisseurs";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { IconActionLink } from "@/components/admin/IconAction";

export default async function AdminSuppliersPage() {
  await requireCapacitePage("catalogue");

  const fournisseurs = await listSuppliers();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Fournisseurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            De qui vient la marchandise, avant qu&apos;elle n&apos;arrive sur un bon de commande.
          </p>
        </div>
        <Link
          href="/admin/suppliers/new"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Nouveau fournisseur
        </Link>
      </div>

      {fournisseurs.length === 0 ? (
        <div className="rounded-sm border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">Aucun fournisseur créé pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Bons</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((fournisseur) => (
                <tr key={fournisseur.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{fournisseur.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fournisseur.email || fournisseur.phone ? (
                      <>
                        {fournisseur.email && <span className="block">{fournisseur.email}</span>}
                        {fournisseur.phone && <span className="block">{fournisseur.phone}</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fournisseur.orderCount}</td>
                  <td className="px-4 py-3">
                    {fournisseur.active ? (
                      <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-sm bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconActionLink
                        href={`/admin/suppliers/${fournisseur.id}`}
                        label="Modifier"
                        icon={Pencil}
                      />
                      <DeleteButton
                        action={`/api/admin/suppliers/${fournisseur.id}`}
                        confirmLabel={`Supprimer définitivement le fournisseur « ${fournisseur.name} » ?`}
                      />
                    </div>
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
