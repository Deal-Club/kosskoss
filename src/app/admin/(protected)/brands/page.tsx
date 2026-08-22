import Image from "next/image";
import Link from "next/link";
import { requireCapacitePage } from "@/lib/dal";
import { Pencil } from "lucide-react";
import { listerMarques } from "@/server/kk/marques";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { IconActionLink } from "@/components/admin/IconAction";
import { BrandImportButton } from "@/components/admin/BrandImportButton";

export default async function AdminBrandsPage() {
  await requireCapacitePage("catalogue");

  const marques = await listerMarques();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Marques</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Logo, description et ordre d&apos;affichage des maisons distribuées. Le libellé saisi sur
            chaque fiche produit reste inchangé ; le rattachement se fait ici.
          </p>
        </div>
        <Link
          href="/admin/brands/new"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Nouvelle marque
        </Link>
      </div>

      <BrandImportButton />

      {marques.length === 0 ? (
        <div className="rounded-sm border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">
            Aucune marque créée pour le moment. Lancez l&apos;import ou créez-en une manuellement.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Produits</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3">Ordre</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {marques.map((marque) => (
                <tr key={marque.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-sm border border-border bg-muted">
                      {marque.logo ? (
                        <Image
                          src={marque.logo}
                          alt={marque.name}
                          fill
                          sizes="40px"
                          className="object-contain"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{marque.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{marque.productCount}</td>
                  <td className="px-4 py-3">
                    {marque.active ? (
                      <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-sm bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{marque.position}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconActionLink
                        href={`/admin/brands/${marque.id}`}
                        label="Modifier"
                        icon={Pencil}
                      />
                      <DeleteButton
                        action={`/api/admin/brands/${marque.id}`}
                        confirmLabel={`Supprimer définitivement la marque « ${marque.name} » ? Les ${marque.productCount} produits associés garderont leur libellé de marque mais perdront ce rattachement.`}
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
