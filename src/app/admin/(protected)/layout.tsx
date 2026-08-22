import { requireAdminSession } from "@/lib/dal";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { countReviewsByStatus } from "@/server/reviews";
import { roleCourant } from "@/server/kk/acces";
import { capacitesDe } from "@/lib/kk/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  // Seule la pastille des avis en attente subsiste dans le menu. Le comptage
  // des campagnes en cours partait avec elle sur chaque page du back-office ;
  // l'entrée ayant disparu du menu, la requête n'a plus de raison d'être.
  const counts = await countReviewsByStatus();
  // Calculé côté serveur, où `roleCourant` peut toucher Prisma, puis descendu
  // en propriété : `AdminSidebar` est un composant client, il ne doit jamais
  // importer `@/server/kk/acces`.
  const capacites = capacitesDe(await roleCourant());

  return (
    <div className="min-h-screen bg-muted lg:flex">
      <AdminSidebar email={session.email} pendingReviews={counts.pending} capacites={capacites} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
