import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { Pencil } from "lucide-react";
import { GroupDeleteButton } from "@/components/admin/GroupForm";
import { IconActionLink } from "@/components/admin/IconAction";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminSession();

  const params = await searchParams;
  const allGroups = await prisma.group.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { categories: true } } },
  });

  const pageInfo = paginate(allGroups, parsePageParam(params.page));
  const groups = pageInfo.items;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Univers produits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Niveau le plus haut du catalogue — chaque univers regroupe plusieurs catégories.
          </p>
        </div>
        <Link
          href="/admin/groups/new"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Nouvel univers
        </Link>
      </div>

      {pageInfo.totalItems === 0 ? (
        <div className="rounded-sm border border-border bg-white p-5">
          <p className="text-sm text-muted-foreground">
            Aucun univers créé pour le moment. Créez-en un pour pouvoir y rattacher des catégories.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Catégories</th>
                  <th className="px-4 py-3">Ordre</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">{group.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      /{group.slug}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{group._count.categories}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.position}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconActionLink
                          href={`/admin/groups/${group.id}`}
                          label="Modifier"
                          icon={Pencil}
                        />
                        <GroupDeleteButton id={group.id} label={group.label} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            {...pageInfo}
            basePath="/admin/groups"
            params={params}
            label="univers"
          />
        </>
      )}
    </div>
  );
}
