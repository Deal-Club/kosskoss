import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// Palette validée pour les daltonismes courants (vert / ambre / rouge).
// L'ambre passe sous 3:1 de contraste : chaque part porte donc une étiquette
// chiffrée et une icône — la couleur n'est jamais la seule information.
const STATUS_COLORS = {
  ok: "#16a34a",
  low: "#e3a008",
  out: "#e3000e",
} as const;

const BRAND = "#e3000e";

export interface PriceBucket {
  label: string;
  count: number;
}

export interface StockStatus {
  ok: number;
  low: number;
  out: number;
}

export interface CategoryValue {
  label: string;
  valueLabel: string;
  value: number;
}

/** Histogramme vertical : combien d'articles par tranche de prix. */
export function PriceDistributionChart({ buckets }: { buckets: PriceBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const width = 100;
  const height = 46;
  const slot = width / buckets.length;
  const barWidth = slot * 0.52;

  return (
    <figure className="rounded-sm border border-border bg-white p-5">
      <figcaption className="mb-1 text-sm font-black text-foreground">
        Répartition des prix
      </figcaption>
      <p className="mb-4 text-xs text-muted-foreground">Nombre d&apos;articles par tranche de prix</p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full"
        role="img"
        aria-label="Nombre d'articles par tranche de prix"
        preserveAspectRatio="none"
      >
        {/* Ligne de base discrète, seul repère nécessaire */}
        <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="0.4" />
        {buckets.map((bucket, index) => {
          const barHeight = (bucket.count / max) * (height - 6);
          const x = index * slot + (slot - barWidth) / 2;
          return (
            <rect
              key={bucket.label}
              x={x}
              y={height - barHeight}
              width={barWidth}
              height={Math.max(barHeight, 0.6)}
              rx="1"
              fill={BRAND}
              opacity={bucket.count === 0 ? 0.15 : 1}
            >
              <title>{`${bucket.label} : ${bucket.count} article${bucket.count > 1 ? "s" : ""}`}</title>
            </rect>
          );
        })}
      </svg>

      <ul className="mt-3 flex justify-between gap-1 text-center">
        {buckets.map((bucket) => (
          <li key={bucket.label} className="flex-1">
            <span className="block text-sm font-black text-foreground">{bucket.count}</span>
            <span className="block text-[10px] leading-tight text-muted-foreground">
              {bucket.label}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Barre empilée : part des articles disponibles, critiques et épuisés. */
export function StockStatusChart({
  status,
  totalUnits,
  averagePriceLabel,
}: {
  status: StockStatus;
  totalUnits: number;
  averagePriceLabel: string;
}) {
  const total = status.ok + status.low + status.out;
  const segments = [
    {
      key: "ok",
      label: "Disponible",
      value: status.ok,
      color: STATUS_COLORS.ok,
      Icon: CheckCircle2,
    },
    {
      key: "low",
      label: "Critique",
      value: status.low,
      color: STATUS_COLORS.low,
      Icon: AlertTriangle,
    },
    { key: "out", label: "En rupture", value: status.out, color: STATUS_COLORS.out, Icon: XCircle },
  ].filter((segment) => segment.value > 0);

  // Écart de 2 unités entre les parts, comme préconisé pour les barres empilées
  const gap = 0.6;
  let offset = 0;

  return (
    <figure className="rounded-sm border border-border bg-white p-5">
      <figcaption className="mb-1 text-sm font-black text-foreground">État des stocks</figcaption>
      <p className="mb-4 text-xs text-muted-foreground">
        {total} article{total > 1 ? "s" : ""} au catalogue
      </p>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun article créé pour le moment.</p>
      ) : (
        <>
          <svg
            viewBox="0 0 100 8"
            className="h-3 w-full"
            role="img"
            aria-label="Répartition des articles par état de stock"
            preserveAspectRatio="none"
          >
            {segments.map((segment, index) => {
              const share = (segment.value / total) * 100;
              const rawWidth = index === segments.length - 1 ? share : share - gap;
              const x = offset;
              offset += share;
              return (
                <rect
                  key={segment.key}
                  x={x}
                  y="0"
                  width={Math.max(rawWidth, 0.8)}
                  height="8"
                  rx="2"
                  fill={segment.color}
                >
                  <title>{`${segment.label} : ${segment.value} article${segment.value > 1 ? "s" : ""}`}</title>
                </rect>
              );
            })}
          </svg>

          <ul className="mt-4 space-y-2">
            {segments.map(({ key, label, value, color, Icon }) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                <Icon className="h-3.5 w-3.5 shrink-0" color={color} aria-hidden />
                <span className="flex-1 text-foreground">{label}</span>
                <span className="font-black text-foreground">{value}</span>
                <span className="w-12 text-right text-xs text-muted-foreground">
                  {Math.round((value / total) * 100)} %
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-xs text-muted-foreground">Pièces en stock</dt>
              <dd className="text-lg font-black text-foreground">{totalUnits}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Prix de vente moyen</dt>
              <dd className="text-lg font-black text-foreground">{averagePriceLabel}</dd>
            </div>
          </dl>
        </>
      )}
    </figure>
  );
}

/** Barres horizontales : valeur du stock par catégorie, du plus fort au plus faible. */
export function StockValueChart({ items }: { items: CategoryValue[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <figure className="rounded-sm border border-border bg-white p-5">
      <figcaption className="mb-1 text-sm font-black text-foreground">
        Valeur du stock par catégorie
      </figcaption>
      <p className="mb-4 text-xs text-muted-foreground">
        Stock × prix de vente, les plus élevées d&apos;abord
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun stock enregistré.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-foreground">{item.label}</span>
                <span className="shrink-0 font-bold text-muted-foreground">{item.valueLabel}</span>
              </div>
              <svg
                viewBox="0 0 100 4"
                className="h-1.5 w-full"
                role="presentation"
                preserveAspectRatio="none"
              >
                <rect x="0" y="0" width="100" height="4" rx="2" fill="#f1f1f1" />
                <rect
                  x="0"
                  y="0"
                  width={Math.max((item.value / max) * 100, 1)}
                  height="4"
                  rx="2"
                  fill={BRAND}
                />
              </svg>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
