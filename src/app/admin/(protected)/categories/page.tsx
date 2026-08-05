import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { IconActionLink } from "@/components/admin/IconAction";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminSession();

  const params = await searchParams;

  // Une seule requête ramène univers, catégorie et nombre de produits dans l'ordre d'affichage.
  const groups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  // Le tableau est déjà une liste à plat, simplement triée par univers puis par
  // position : la pagination porte donc sur cette liste à plat. Les catégories
  // d'un même univers restent contiguës, seul un univers à cheval sur deux pages
  // se retrouve coupé — la colonne « Univers » garde l'information sur chaque ligne.
  const allRows = groups.flatMap((group) =>
    group.categories.map((category) => ({
      id: `${group.slug}/${category.slug}`,
      groupLabel: group.label,
      slug: category.slug,
      label: category.label,
      productCount: category._count.products,
    })),
  );

  const pageInfo = paginate(allRows, parsePageParam(params.page));
  const rows = pageInfo.items;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Catégories</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/groups"
            className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
          >
            Gérer les univers
          </Link>
          <Link
            href="/admin/categories/new"
            className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Nouvelle catégorie
          </Link>
        </div>
      </div>

      {pageInfo.totalItems === 0 ? (
        <div className="rounded-sm border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">
            Aucune catégorie créée pour le moment. Créez d&apos;abord un univers produits, puis une
            catégorie à l&apos;intérieur.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3">Univers</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Produits</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.groupLabel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">/{row.id}</td>
                    <td className="px-4 py-3">
                      {row.productCount === 0 ? (
                        <span className="font-semibold text-destructive">0</span>
                      ) : (
                        <span className="text-muted-foreground">{row.productCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconActionLink
                          href={`/admin/categories/${row.id}`}
                          label="Modifier"
                          icon={Pencil}
                        />
                        <DeleteButton
                          action={`/api/admin/categories/${row.id}`}
                          confirmLabel={`Supprimer définitivement la catégorie « ${row.label} » ? Les ${row.productCount} produits associés seront également supprimés.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            {...pageInfo}
            basePath="/admin/categories"
            params={params}
            label="catégories"
          />
        </>
      )}
    </div>
  );
}
