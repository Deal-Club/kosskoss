import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { countReviewsByStatus, isReviewStatus, listReviews } from "@/server/reviews";
import { ReviewModerationTable } from "@/components/admin/ReviewModerationTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";
import type { ReviewStatus } from "@/server/types";

interface StatusTab {
  value: ReviewStatus | "all";
  label: string;
  href: string;
}

const EMPTY_MESSAGES: Record<ReviewStatus | "all", string> = {
  all: "Aucun avis pour le moment.",
  pending: "Aucun avis en attente — tout est traité.",
  approved: "Aucun avis publié pour le moment.",
  rejected: "Aucun avis refusé jusqu'à présent.",
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdminSession();

  // `params` est conservé entier pour que l'onglet actif reste dans les liens
  // de pagination.
  const params = await searchParams;
  const activeStatus = isReviewStatus(params.status) ? params.status : undefined;

  const [allReviews, counts] = await Promise.all([
    listReviews(activeStatus ? { status: activeStatus } : undefined),
    countReviewsByStatus(),
  ]);

  const pageInfo = paginate(allReviews, parsePageParam(params.page));
  const reviews = pageInfo.items;

  const tabs: StatusTab[] = [
    {
      value: "pending",
      label: `En attente (${counts.pending})`,
      href: "/admin/reviews?status=pending",
    },
    {
      value: "approved",
      label: `Publiés (${counts.approved})`,
      href: "/admin/reviews?status=approved",
    },
    {
      value: "rejected",
      label: `Refusés (${counts.rejected})`,
      href: "/admin/reviews?status=rejected",
    },
    { value: "all", label: `Tous (${counts.total})`, href: "/admin/reviews" },
  ];

  const activeTab: ReviewStatus | "all" = activeStatus ?? "all";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Avis clients</h1>
        {counts.pending > 0 && (
          <span className="rounded-sm bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
            {counts.pending} avis en attente de validation
          </span>
        )}
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Seuls les avis validés apparaissent dans la boutique. Les avis en attente et refusés restent
        invisibles pour les clients.
      </p>

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={`rounded-sm border px-4 py-2 text-sm font-bold ${
              activeTab === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-foreground hover:border-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {pageInfo.totalItems === 0 ? (
        <p className="rounded-sm border border-border bg-white px-4 py-6 text-sm text-muted-foreground">
          {EMPTY_MESSAGES[activeTab]}
        </p>
      ) : (
        <>
          <ReviewModerationTable reviews={reviews} />
          <AdminPagination
            {...pageInfo}
            basePath="/admin/reviews"
            params={params}
            label="avis"
          />
        </>
      )}
    </div>
  );
}
