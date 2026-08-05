import { MousePointerClick, ShoppingCart } from "lucide-react";

/**
 * Graphiques du tableau de bord d'une campagne, en SVG écrit à la main —
 * mêmes règles que DashboardCharts.tsx : aucune librairie, une étiquette
 * chiffrée sur chaque part, et jamais la couleur comme seule information.
 */

const BRAND = "#e3000e";
const ORDER_COLOR = "#16a34a";

export interface FunnelInput {
  sent: number;
  opened: number;
  clicked: number;
  orders: number;
}

interface FunnelStep {
  key: string;
  label: string;
  value: number;
  opacity: number;
}

/**
 * Entonnoir Envoyés → Ouverts → Cliqués → Commandes.
 *
 * Les largeurs sont rapportées au nombre de messages partis : c'est la seule
 * base qui ait un sens, un taux calculé sur la file d'attente mélangerait les
 * envois faits et ceux qui restent à faire.
 */
export function CampaignFunnel({ sent, opened, clicked, orders }: FunnelInput) {
  const steps: FunnelStep[] = [
    { key: "sent", label: "Envoyés", value: sent, opacity: 1 },
    { key: "opened", label: "Ouverts", value: opened, opacity: 0.75 },
    { key: "clicked", label: "Cliqués", value: clicked, opacity: 0.5 },
    { key: "orders", label: "Commandes", value: orders, opacity: 0.3 },
  ];

  const base = Math.max(sent, 1);

  return (
    <figure className="rounded-sm border border-border bg-white p-5">
      <figcaption className="mb-1 text-sm font-black text-foreground">
        De l&apos;envoi à la commande
      </figcaption>
      <p className="mb-4 text-xs text-muted-foreground">
        Part de chaque étape rapportée aux messages réellement partis
      </p>

      {sent === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun message n&apos;est encore parti.</p>
      ) : (
        <ul className="space-y-3">
          {steps.map((step) => {
            const share = Math.round((step.value / base) * 100);
            return (
              <li key={step.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-foreground">{step.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    <span className="font-black text-foreground">{step.value}</span> · {share} %
                  </span>
                </div>
                <svg
                  viewBox="0 0 100 6"
                  className="h-2.5 w-full"
                  role="img"
                  aria-label={`${step.label} : ${step.value}, soit ${share} % des messages partis`}
                  preserveAspectRatio="none"
                >
                  <rect x="0" y="0" width="100" height="6" rx="2" fill="#f1f1f1" />
                  <rect
                    x="0"
                    y="0"
                    width={Math.max(share, 0.8)}
                    height="6"
                    rx="2"
                    fill={BRAND}
                    opacity={step.opacity}
                  />
                </svg>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}

export interface TimelinePoint {
  day: string;
  clic: number;
  commande: number;
}

// Repère du graphique, en unités du viewBox.
const PLOT = { left: 6, right: 98, top: 6, bottom: 40 } as const;

function pathFor(values: readonly number[], max: number): string {
  if (values.length === 0) return "";
  const width = PLOT.right - PLOT.left;
  const height = PLOT.bottom - PLOT.top;
  // Un seul point ne dessine pas de ligne : il est centré, et le marqueur
  // ci-dessous reste visible.
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = values.length > 1 ? PLOT.left + index * step : PLOT.left + width / 2;
      const y = PLOT.bottom - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function coordinates(values: readonly number[], max: number): { x: number; y: number }[] {
  const width = PLOT.right - PLOT.left;
  const height = PLOT.bottom - PLOT.top;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: values.length > 1 ? PLOT.left + index * step : PLOT.left + width / 2,
    y: PLOT.bottom - (value / max) * height,
  }));
}

function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

/**
 * Clics et commandes par jour.
 *
 * Deux séries, deux couleurs, mais aussi deux formes de marqueur : un rond pour
 * les clics, un carré pour les commandes. Un daltonien lit la courbe sans avoir
 * à distinguer le rouge du vert.
 */
export function CampaignTimeline({ points }: { points: TimelinePoint[] }) {
  const clicks = points.map((point) => point.clic);
  const orders = points.map((point) => point.commande);
  const max = Math.max(...clicks, ...orders, 1);

  const clickPoints = coordinates(clicks, max);
  const orderPoints = coordinates(orders, max);

  const totalClicks = clicks.reduce((sum, value) => sum + value, 0);
  const totalOrders = orders.reduce((sum, value) => sum + value, 0);

  return (
    <figure className="rounded-sm border border-border bg-white p-5">
      <figcaption className="mb-1 text-sm font-black text-foreground">Activité par jour</figcaption>
      <p className="mb-4 text-xs text-muted-foreground">
        Clics et commandes, heure de Berlin, sur toute la durée de la campagne
      </p>

      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun événement enregistré pour le moment.
        </p>
      ) : (
        <>
          <svg
            viewBox="0 0 104 48"
            className="h-44 w-full"
            role="img"
            aria-label={`Clics et commandes par jour : ${totalClicks} clic(s) et ${totalOrders} commande(s) au total`}
          >
            {/* Ligne de base, seul repère nécessaire */}
            <line
              x1={PLOT.left}
              y1={PLOT.bottom}
              x2={PLOT.right}
              y2={PLOT.bottom}
              stroke="#e5e7eb"
              strokeWidth="0.3"
            />
            <line
              x1={PLOT.left}
              y1={PLOT.top}
              x2={PLOT.right}
              y2={PLOT.top}
              stroke="#f1f1f1"
              strokeWidth="0.3"
            />

            <path
              d={pathFor(clicks, max)}
              fill="none"
              stroke={BRAND}
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
            <path
              d={pathFor(orders, max)}
              fill="none"
              stroke={ORDER_COLOR}
              strokeWidth="0.7"
              strokeLinejoin="round"
              strokeDasharray="2 1.2"
            />

            {clickPoints.map((point, index) => (
              <circle key={`c-${points[index].day}`} cx={point.x} cy={point.y} r="0.8" fill={BRAND}>
                <title>{`${shortDay(points[index].day)} : ${clicks[index]} clic(s)`}</title>
              </circle>
            ))}
            {orderPoints.map((point, index) => (
              <rect
                key={`o-${points[index].day}`}
                x={point.x - 0.7}
                y={point.y - 0.7}
                width="1.4"
                height="1.4"
                fill={ORDER_COLOR}
              >
                <title>{`${shortDay(points[index].day)} : ${orders[index]} commande(s)`}</title>
              </rect>
            ))}

            {/* Bornes de l'axe des jours : le premier et le dernier suffisent */}
            <text x={PLOT.left} y="46" fontSize="2.6" fill="#6b7280">
              {shortDay(points[0].day)}
            </text>
            <text x={PLOT.right} y="46" fontSize="2.6" fill="#6b7280" textAnchor="end">
              {shortDay(points[points.length - 1].day)}
            </text>
            <text x={PLOT.left} y={PLOT.top - 1.5} fontSize="2.6" fill="#6b7280">
              {max}
            </text>
          </svg>

          <ul className="mt-3 flex flex-wrap gap-4 text-xs">
            <li className="flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" color={BRAND} aria-hidden />
              <span className="text-foreground">Clics</span>
              <span className="font-black text-foreground">{totalClicks}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" color={ORDER_COLOR} aria-hidden />
              <span className="text-foreground">Commandes</span>
              <span className="font-black text-foreground">{totalOrders}</span>
            </li>
          </ul>
        </>
      )}
    </figure>
  );
}
