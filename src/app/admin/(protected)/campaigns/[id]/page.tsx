import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Info,
  MailX,
  MousePointerClick,
  Package,
  Send,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { campaignStats, getCampaign, listRecipients } from "@/server/campaigns";
import { listCampaignOrders } from "@/server/campaignAdmin";
import { formatPrice } from "@/server/store";
import { campaignTypeDefinition, type DiscountKind } from "@/lib/campaigns";
import { ORDER_STATUS_BADGES, ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import {
  CampaignProgressBar,
  CampaignStatusBadge,
  CampaignTypeBadge,
} from "@/components/admin/CampaignBadges";
import { CampaignFunnel, CampaignTimeline } from "@/components/admin/CampaignCharts";
import { CampaignActions } from "@/components/admin/CampaignActions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Filtres du tableau des destinataires, statuts de file et étapes atteintes mêlés. */
const RECIPIENT_FILTERS = [
  { value: "", label: "Tous" },
  { value: "en_attente", label: "En attente" },
  { value: "envoye", label: "Envoyés" },
  { value: "ouvert", label: "Ouverts" },
  { value: "clique", label: "Cliqués" },
  { value: "commande", label: "Ont commandé" },
  { value: "echec", label: "En échec" },
  { value: "ignore", label: "Ignorés" },
] as const;

function discountLabel(kind: DiscountKind, value: number): string {
  switch (kind) {
    case "percent":
      return `−${value} %`;
    case "amount":
      return `−${formatPrice(value)}`;
    case "free_shipping":
      return "Livraison offerte";
    case "none":
      return "Aucune remise";
  }
}

/** Taux affiché sous une tuile ; « — » tant que la base de calcul est vide. */
function share(part: number, total: number, suffix: string): string {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)} % ${suffix}`;
}

export default async function AdminCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rstatus?: string; rpage?: string }>;
}) {
  await requireAdminSession();

  const { id } = await params;
  const query = await searchParams;

  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [stats, recipients, orders] = await Promise.all([
    campaignStats(id),
    listRecipients(id),
    listCampaignOrders(id),
  ]);

  const filter = RECIPIENT_FILTERS.some((entry) => entry.value === query.rstatus)
    ? (query.rstatus ?? "")
    : "";

  const filteredRecipients = recipients.filter((recipient) => {
    switch (filter) {
      case "":
        return true;
      case "ouvert":
        return recipient.openedAt !== null;
      case "clique":
        return recipient.firstClickedAt !== null;
      case "commande":
        return recipient.attributedCents > 0;
      default:
        return recipient.status === filter;
    }
  });

  const recipientPage = paginate(filteredRecipients, parsePageParam(query.rpage));

  const definition = campaignTypeDefinition(campaign.type);
  const averageOrderCents =
    stats.orderCount > 0 ? Math.round(stats.revenueCents / stats.orderCount) : 0;

  const tiles = [
    {
      key: "sent",
      label: "Envoyés",
      icon: Send,
      value: String(stats.sentCount),
      note: share(stats.sentCount, stats.recipientCount, "de la file"),
    },
    {
      key: "opened",
      label: "Ouvertures",
      icon: Eye,
      value: String(stats.openedCount),
      note: share(stats.openedCount, stats.sentCount, "des envois"),
    },
    {
      key: "clicked",
      label: "Clics",
      icon: MousePointerClick,
      value: String(stats.clickedCount),
      note: share(stats.clickedCount, stats.sentCount, "des envois"),
    },
    {
      key: "orders",
      label: "Commandes",
      icon: ShoppingCart,
      value: String(stats.orderCount),
      note: share(stats.orderCount, stats.clickedCount, "des clics"),
    },
    {
      key: "revenue",
      label: "CA généré",
      icon: Wallet,
      value: formatPrice(stats.revenueCents),
      note: averageOrderCents > 0 ? `${formatPrice(averageOrderCents)} par commande` : "—",
    },
    {
      key: "unsubscribed",
      label: "Désinscriptions",
      icon: MailX,
      value: String(stats.unsubscribedCount),
      note: share(stats.unsubscribedCount, stats.sentCount, "des envois"),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/campaigns"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Toutes les campagnes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">{campaign.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{campaign.code}</span>
              <span aria-hidden>·</span>
              <span>
                du {dateFormatter.format(campaign.startsAt)} au{" "}
                {dateFormatter.format(campaign.endsAt)}
              </span>
              <span aria-hidden>·</span>
              <span>{discountLabel(campaign.discountKind, campaign.discountValue)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CampaignTypeBadge type={campaign.type} />
            <CampaignStatusBadge status={campaign.status} />
            {campaign.status === "brouillon" && (
              <DeleteButton
                action={`/api/admin/campaigns/${campaign.id}`}
                confirmLabel={`Supprimer définitivement le brouillon « ${campaign.name} » ?`}
              />
            )}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map(({ key, label, icon: Icon, value, note }) => (
          <div key={key} className="rounded-sm border border-border bg-white p-4">
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-sm bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="truncate text-xl font-black text-foreground" title={value}>
              {value}
            </p>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      {(campaign.status === "en_cours" ||
        campaign.status === "pausee" ||
        stats.failedCount > 0) && (
        <section className="rounded-sm border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-black text-foreground">Avancement de l&apos;envoi</h2>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
            <CampaignProgressBar
              sent={stats.sentCount}
              total={stats.recipientCount}
              label="Messages partis"
            />

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">En attente</dt>
                <dd className="text-lg font-black text-foreground">{stats.pendingCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">En échec</dt>
                <dd className="text-lg font-black text-foreground">{stats.failedCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ignorés</dt>
                <dd className="text-lg font-black text-foreground">{stats.ignoredCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Prochain lot</dt>
                <dd className="text-sm font-bold text-foreground">
                  {campaign.nextBatchAt
                    ? dateTimeFormatter.format(campaign.nextBatchAt)
                    : "aucun programmé"}
                </dd>
              </div>
            </dl>
          </div>

          <CampaignActions
            campaignId={campaign.id}
            status={campaign.status}
            failedCount={stats.failedCount}
            pendingCount={stats.pendingCount}
          />
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CampaignFunnel
          sent={stats.sentCount}
          opened={stats.openedCount}
          clicked={stats.clickedCount}
          orders={stats.orderCount}
        />
        <CampaignTimeline points={stats.series} />
      </section>

      <section className="flex items-start gap-3 rounded-sm border border-border bg-white p-5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">
            Le taux d&apos;ouverture n&apos;est qu&apos;un indice.
          </span>{" "}
          Il repose sur le chargement d&apos;une image invisible. Depuis iOS 15, la protection de la
          vie privée d&apos;Apple Mail charge cette image pour tout le monde, même sans ouverture
          réelle&nbsp;: le chiffre est gonflé, parfois du double. À l&apos;inverse, un client qui lit
          le message sans afficher les images n&apos;est pas compté. Pilotez sur les clics et sur les
          commandes, seuls gestes que le destinataire fait volontairement.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-foreground">
          Produits de la campagne{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            · {discountLabel(campaign.discountKind, campaign.discountValue)}
          </span>
        </h2>

        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Produit
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Prix de référence
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Prix de campagne
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Économie
                </th>
              </tr>
            </thead>
            <tbody>
              {campaign.products.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun produit rattaché.
                  </td>
                </tr>
              )}
              {campaign.products.map((product) => {
                const saved = product.basePriceCents - product.priceCents;
                return (
                  <tr key={product.productId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${product.productId}`}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {product.brand} {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">
                      {formatPrice(product.basePriceCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-black whitespace-nowrap text-foreground">
                      {formatPrice(product.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {saved > 0 ? (
                        <span className="font-bold text-primary">−{formatPrice(saved)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {definition.showsCountdown && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ce type de campagne affiche un compte à rebours sur la boutique jusqu&apos;au{" "}
            {dateTimeFormatter.format(campaign.endsAt)}.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-black text-foreground">
            Destinataires{" "}
            <span className="text-sm font-semibold text-muted-foreground">
              · {recipients.length} au total
            </span>
          </h2>
        </div>

        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtrer les destinataires">
          {RECIPIENT_FILTERS.map((entry) => (
            <Link
              key={entry.value || "all"}
              href={
                entry.value
                  ? `/admin/campaigns/${campaign.id}?rstatus=${entry.value}`
                  : `/admin/campaigns/${campaign.id}`
              }
              aria-current={filter === entry.value ? "page" : undefined}
              className={`rounded-sm border px-3 py-1.5 text-sm font-bold ${
                filter === entry.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:border-primary"
              }`}
            >
              {entry.label}
            </Link>
          ))}
        </nav>

        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Contact
                </th>
                <th scope="col" className="px-4 py-3">
                  État
                </th>
                <th scope="col" className="px-4 py-3">
                  Envoyé le
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Clics
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Montant attribué
                </th>
              </tr>
            </thead>
            <tbody>
              {recipientPage.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun destinataire pour ce filtre.
                  </td>
                </tr>
              )}
              {recipientPage.items.map((recipient) => (
                <tr key={recipient.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-foreground">
                      {`${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email}
                    </span>
                    <span className="block text-xs text-muted-foreground">{recipient.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {recipient.status === "en_attente" && (
                        <span className="rounded-sm bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                          En attente
                        </span>
                      )}
                      {recipient.status === "ignore" && (
                        <span className="rounded-sm bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                          Ignoré
                        </span>
                      )}
                      {recipient.status === "envoye" && (
                        <span className="rounded-sm bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                          Envoyé
                        </span>
                      )}
                      {recipient.openedAt && (
                        <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                          Ouvert
                        </span>
                      )}
                      {recipient.firstClickedAt && (
                        <span className="rounded-sm bg-[#16a34a] px-2 py-1 text-xs font-bold text-white">
                          Cliqué
                        </span>
                      )}
                      {recipient.attributedCents > 0 && (
                        <span className="rounded-sm bg-[#16a34a] px-2 py-1 text-xs font-bold text-white">
                          Commandé
                        </span>
                      )}
                      {recipient.unsubscribedAt && (
                        <span className="rounded-sm border border-border px-2 py-1 text-xs font-bold text-muted-foreground">
                          Désinscrit
                        </span>
                      )}
                      {recipient.status === "echec" && (
                        <span className="rounded-sm bg-destructive px-2 py-1 text-xs font-bold text-white">
                          Échec
                        </span>
                      )}
                    </span>
                    {recipient.status === "echec" && recipient.error && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {recipient.error}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {recipient.sentAt ? dateTimeFormatter.format(recipient.sentAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {recipient.clickCount}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-foreground">
                    {recipient.attributedCents > 0 ? formatPrice(recipient.attributedCents) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AdminPagination
          {...recipientPage}
          basePath={`/admin/campaigns/${campaign.id}`}
          params={query}
          label="destinataires"
          pageParam="rpage"
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-foreground">
          Commandes attribuées{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            · {formatPrice(stats.revenueCents)}
          </span>
        </h2>

        {orders.length === 0 ? (
          <div className="rounded-sm border border-border bg-white p-6">
            <p className="flex items-center gap-2 font-bold text-foreground">
              <Package className="h-4 w-4 text-muted-foreground" aria-hidden />
              Aucune commande attribuée pour l&apos;instant.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Une commande n&apos;est rattachée à cette campagne que si le client a cliqué sur un lien
              du message dans les trente jours précédents.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Numéro
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-bold text-foreground hover:text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                      {order.freeShipping && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          livraison offerte par la campagne
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {dateTimeFormatter.format(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-foreground">
                        {order.customerName || order.email}
                      </span>
                      <span className="block text-xs text-muted-foreground">{order.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-sm px-2 py-1 text-xs font-bold ${ORDER_STATUS_BADGES[order.status]}`}
                      >
                        {ORDER_STATUS_LABELS[order.status].fr}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-foreground">
                      {formatPrice(order.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
