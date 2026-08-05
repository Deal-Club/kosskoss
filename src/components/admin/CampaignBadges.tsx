import {
  CAMPAIGN_STATUS_LABELS,
  campaignTypeDefinition,
  type CampaignStatus,
  type CampaignType,
} from "@/lib/campaigns";

/**
 * Pastilles et jauges communes aux écrans de campagne.
 *
 * Chaque pastille porte son libellé en toutes lettres : la couleur situe d'un
 * coup d'œil, elle ne dit jamais rien à elle seule — même règle que dans
 * DashboardCharts.tsx.
 */
export const CAMPAIGN_STATUS_BADGES: Record<CampaignStatus, string> = {
  brouillon: "bg-muted text-muted-foreground",
  en_cours: "bg-accent text-accent-foreground",
  envoyee: "bg-[#16a34a] text-white",
  pausee: "bg-secondary text-secondary-foreground",
  annulee: "bg-destructive text-white",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-block rounded-sm px-2 py-1 text-xs font-bold whitespace-nowrap ${CAMPAIGN_STATUS_BADGES[status]}`}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}

export function CampaignTypeBadge({ type }: { type: CampaignType }) {
  return (
    <span className="inline-block rounded-sm border border-border px-2 py-1 text-xs font-semibold whitespace-nowrap text-foreground">
      {campaignTypeDefinition(type).label}
    </span>
  );
}

/**
 * Avancement d'un envoi.
 *
 * Barre en SVG plutôt qu'en div : la largeur dépend d'un pourcentage calculé,
 * qu'aucune classe utilitaire ne peut exprimer. Le chiffre est toujours écrit
 * à côté, la barre ne fait qu'illustrer.
 */
export function CampaignProgressBar({
  sent,
  total,
  label,
}: {
  sent: number;
  total: number;
  /** Texte affiché au-dessus de la barre ; masqué quand il est vide. */
  label?: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

  return (
    <div className="min-w-28">
      {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
      <svg
        viewBox="0 0 100 4"
        className="h-1.5 w-full"
        role="img"
        aria-label={`${sent} message(s) partis sur ${total}, soit ${percent} %`}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="100" height="4" rx="2" fill="#f1f1f1" />
        <rect x="0" y="0" width={Math.max(percent, 1)} height="4" rx="2" fill="#e3000e" />
      </svg>
      <p className="mt-1 text-xs font-semibold text-foreground">
        {sent} / {total} <span className="font-normal text-muted-foreground">({percent} %)</span>
      </p>
    </div>
  );
}
