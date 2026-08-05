import type { ReactNode } from "react";

interface PreviewPanelProps {
  /** Adresse simulée, affichée dans la fausse barre du navigateur. */
  url: string;
  /** Commandes optionnelles placées à droite du titre, par exemple un choix de vue. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Cadre commun aux aperçus du back-office : titre, fausse barre d'adresse et
 * zone défilante qui reste visible pendant que l'on remplit le formulaire.
 *
 * Réservé au bureau : en dessous de 1280 px le formulaire occupe toute la
 * largeur et le panneau disparaît.
 */
export function PreviewPanel({ url, actions, children }: PreviewPanelProps) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black tracking-wide text-foreground uppercase">
            Aperçu boutique
          </h2>
          {actions}
        </div>

        <div className="overflow-hidden rounded-sm border border-border bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-sm bg-white px-2 py-1 text-[11px] text-muted-foreground">
              {url}
            </span>
          </div>

          {/* Hauteur bornée à la fenêtre pour que le panneau reste collé en haut
              sans jamais dépasser l'écran, quel que soit le volume de contenu. */}
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">{children}</div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Mise à jour en direct. Rien n&apos;est enregistré tant que vous n&apos;avez pas cliqué
          sur « Enregistrer ».
        </p>
      </div>
    </aside>
  );
}
