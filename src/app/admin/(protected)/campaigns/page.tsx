import Link from "next/link";
import { BarChart3, Megaphone } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { listCampaigns } from "@/server/campaigns";
import { formatPrice } from "@/server/store";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPES,
  campaignTypeDefinition,
  isCampaignStatus,
  isCampaignType,
  type CampaignStatus,
  type CampaignType,
} from "@/lib/campaigns";
import {
  CampaignProgressBar,
  CampaignStatusBadge,
  CampaignTypeBadge,
} from "@/components/admin/CampaignBadges";
import { IconActionLink } from "@/components/admin/IconAction";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Taux rapporté aux messages réellement partis, jamais à la file entière. */
function rate(part: number, sent: number): string {
  if (sent <= 0) return "—";
  return `${Math.round((part / sent) * 100)} %`;
}

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  await requireAdminSession();

  // `params` est conservé entier : il alimente les liens de pagination et fait
  // donc survivre les filtres actifs.
  const params = await searchParams;
  const activeStatus: CampaignStatus | undefined = isCampaignStatus(params.status ?? "")
    ? (params.status as CampaignStatus)
    : undefined;
  const activeType: CampaignType | undefined = isCampaignType(params.type ?? "")
    ? (params.type as CampaignType)
    : undefined;

  const all = await listCampaigns();
  const filtered = all.filter(
    (campaign) =>
      (!activeStatus || campaign.status === activeStatus) &&
      (!activeType || campaign.type === activeType),
  );

  const pageInfo = paginate(filtered, parsePageParam(params.page));
  const campaigns = pageInfo.items;

  const running = all.filter((campaign) => campaign.status === "en_cours").length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Campagnes</h1>
        <div className="flex flex-wrap items-center gap-2">
          {running > 0 && (
            <span className="rounded-sm bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
              {running} envoi{running === 1 ? "" : "s"} en cours
            </span>
          )}
          <Link
            href="/admin/campaigns/new"
            className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Nouvelle campagne
          </Link>
        </div>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Une campagne pose une remise sur des produits pendant une période donnée et annonce l&apos;offre
        par e-mail. Les taux d&apos;ouverture sont indicatifs&nbsp;; ce sont les clics et les commandes
        qui mesurent le résultat.
      </p>

      {all.length === 0 ? (
        <div className="rounded-sm border border-border bg-white p-10 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-muted text-muted-foreground">
            <Megaphone className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-lg font-black text-foreground">Aucune campagne pour le moment</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Une campagne se prépare en cinq étapes&nbsp;: le type d&apos;offre, les produits concernés,
            la remise et sa période, le message envoyé, puis les destinataires et la cadence
            d&apos;envoi. Rien n&apos;est envoyé tant que vous n&apos;avez pas confirmé la dernière étape.
          </p>
          <Link
            href="/admin/campaigns/new"
            className="mt-6 inline-block rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Créer la première campagne
          </Link>
        </div>
      ) : (
        <>
          {/* Un seul formulaire GET : les deux filtres restent ensemble dans l'URL */}
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Statut</span>
              <select name="status" defaultValue={activeStatus ?? ""} className={inputClass}>
                <option value="">Tous les statuts</option>
                {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Type</span>
              <select name="type" defaultValue={activeType ?? ""} className={inputClass}>
                <option value="">Tous les types</option>
                {CAMPAIGN_TYPES.map((definition) => (
                  <option key={definition.type} value={definition.type}>
                    {definition.label}
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
            {(activeStatus || activeType) && (
              <Link
                href="/admin/campaigns"
                className="py-2 text-sm font-semibold text-primary hover:underline"
              >
                Réinitialiser
              </Link>
            )}
          </form>

          <p className="mb-3 text-sm text-muted-foreground">
            {pageInfo.totalItems === 1 ? "1 campagne" : `${pageInfo.totalItems} campagnes`}
            {activeType && ` de type « ${campaignTypeDefinition(activeType).label} »`}
          </p>

          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Campagne
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Période
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Produits
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Destinataires
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Ouvertures
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Clics
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Commandes
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    CA généré
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune campagne ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/campaigns/${campaign.id}`}
                        className="font-bold text-foreground hover:text-primary"
                      >
                        {campaign.name}
                      </Link>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {campaign.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CampaignTypeBadge type={campaign.type} />
                    </td>
                    <td className="px-4 py-3">
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {dateFormatter.format(new Date(campaign.startsAt))}
                      <span className="mx-1" aria-hidden>
                        →
                      </span>
                      {dateFormatter.format(new Date(campaign.endsAt))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {campaign.productCount}
                    </td>
                    <td className="px-4 py-3">
                      {campaign.status === "en_cours" ? (
                        <CampaignProgressBar
                          sent={campaign.sentCount}
                          total={campaign.recipientCount}
                        />
                      ) : (
                        <span className="font-semibold text-foreground">
                          {campaign.recipientCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold text-foreground">
                        {rate(campaign.openedCount, campaign.sentCount)}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({campaign.openedCount})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold text-foreground">
                        {rate(campaign.clickedCount, campaign.sentCount)}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({campaign.clickedCount})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {campaign.orderCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-foreground">
                      {formatPrice(campaign.revenueCents)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <IconActionLink
                          href={`/admin/campaigns/${campaign.id}`}
                          label={`Ouvrir le tableau de bord de « ${campaign.name} »`}
                          icon={BarChart3}
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
            basePath="/admin/campaigns"
            params={params}
            label="campagnes"
          />
        </>
      )}
    </div>
  );
}
