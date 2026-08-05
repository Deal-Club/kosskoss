import { requireAdminSession } from "@/lib/dal";
import { SUPERADMIN_ROLE, isSuperadminSession, listAdminUsers } from "@/server/admins";
import { UserForm, UserRowActions } from "@/components/admin/UserForm";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  [SUPERADMIN_ROLE]: "Superadmin",
};

function formatDateTime(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;

  // Les superadmins n'apparaissent que pour un superadmin : ni dans le tableau,
  // ni dans les compteurs affichés au-dessus.
  const viewerIsSuperadmin = await isSuperadminSession(session);
  const allUsers = await listAdminUsers({ includeSuperadmins: viewerIsSuperadmin });
  // Le compteur d'actifs porte sur la totalité des comptes, pas sur la page affichée.
  const activeCount = allUsers.filter((user) => user.active).length;

  const pageInfo = paginate(allUsers, parsePageParam(params.page));
  const users = pageInfo.items;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Accès</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pageInfo.totalItems} {pageInfo.totalItems === 1 ? "compte" : "comptes"}, dont{" "}
          {activeCount} actif{activeCount > 1 ? "s" : ""}. Le dernier accès actif ne peut être ni
          désactivé ni supprimé.
        </p>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Dernière connexion</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              // session.email est toujours renseigné, session.userId seulement depuis la mise à jour du login.
              const isSelf = user.id === session.userId || user.email === session.email;

              return (
                <tr key={user.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {user.name}
                    {isSelf ? (
                      <span className="ml-2 rounded-sm bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">
                        Vous
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </td>
                  <td className="px-4 py-3">
                    {user.active ? (
                      <span className="font-semibold text-foreground">Actif</span>
                    ) : (
                      <span className="font-semibold text-destructive">Bloqué</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3">
                    <UserRowActions user={user} isSelf={isSelf} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <AdminPagination
          {...pageInfo}
          basePath="/admin/users"
          params={params}
          label="comptes"
        />
      </div>

      <UserForm allowSuperadmin={viewerIsSuperadmin} />
    </div>
  );
}
