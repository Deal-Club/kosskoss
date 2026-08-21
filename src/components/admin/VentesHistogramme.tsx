import type { PointJour } from "@/lib/kk/ventes";
import { formatFcfa } from "@/lib/kk/format";

/**
 * Histogramme des ventes par jour, en SVG écrit à la main.
 *
 * Le projet n'a pas de bibliothèque de graphiques et n'en gagne pas une pour ce
 * lot : les graphiques existants du back-office sont eux aussi du SVG direct.
 *
 * Chaque barre porte un `title` : la couleur et la hauteur ne sont jamais la
 * seule information, ce qui vaut aussi pour la lecture au lecteur d'écran.
 */
export function VentesHistogramme({ points }: { points: PointJour[] }) {
  const maximum = Math.max(...points.map((point) => point.chiffreAffairesCents), 1);
  const largeurBarre = 100 / points.length;

  return (
    <div className="rounded-sm border border-border p-4">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Ventes par jour sur ${points.length} jours`}
      >
        {points.map((point, index) => {
          const hauteur = (point.chiffreAffairesCents / maximum) * 38;
          return (
            <rect
              key={point.jour}
              x={index * largeurBarre + largeurBarre * 0.15}
              y={40 - hauteur}
              width={largeurBarre * 0.7}
              height={hauteur}
              className="fill-primary"
            >
              <title>{`${point.jour} — ${formatFcfa(point.chiffreAffairesCents)} (${point.nombreCommandes} commande${point.nombreCommandes > 1 ? "s" : ""})`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{points[0]?.jour}</span>
        <span>{points[points.length - 1]?.jour}</span>
      </div>
    </div>
  );
}
