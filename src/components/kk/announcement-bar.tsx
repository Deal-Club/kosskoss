import { Sparkles, Truck, Gift, Percent, BadgeCheck, Clock, MessageCircle, Star } from "lucide-react";
import type { AnnouncementConfig, AnnouncementItem } from "@/lib/kk/announcement";

/**
 * Bandeau d'annonce défilant.
 *
 * Le défilement est en CSS pur — une translation de −50 % sur une piste dont
 * le contenu est dupliqué exactement une fois. La copie repasse donc à
 * l'endroit précis où l'original s'arrête : la boucle est invisible, sans
 * JavaScript, sans mesure de largeur, et sans dépendre du nombre de messages.
 *
 * Couleurs et vitesse arrivent en variables CSS parce qu'elles viennent de la
 * base : une classe Tailwind ne peut pas porter une valeur inconnue à la
 * compilation, et Tailwind purge ce qu'il ne voit pas dans le code.
 */

/**
 * Icônes proposées au back-office. Liste fermée à dessein : `lucide-react`
 * en exporte des milliers, tous embarquer alourdirait le bundle de la page la
 * plus visitée du site pour une poignée d'usages.
 */
const ICONES = {
  sparkles: Sparkles,
  truck: Truck,
  gift: Gift,
  percent: Percent,
  badge: BadgeCheck,
  clock: Clock,
  message: MessageCircle,
  star: Star,
} as const;

export type IconeAnnonce = keyof typeof ICONES;

export const ICONES_DISPONIBLES = Object.keys(ICONES) as IconeAnnonce[];

export function estIconeAnnonce(valeur: string): valeur is IconeAnnonce {
  return valeur in ICONES;
}

function Message({ item }: { item: AnnouncementItem }) {
  const Icone = estIconeAnnonce(item.icon) ? ICONES[item.icon] : null;
  return (
    <span className="mx-6 inline-flex shrink-0 items-center gap-2">
      {Icone && <Icone className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />}
      {item.message}
    </span>
  );
}

export function AnnouncementBar({
  items,
  config,
}: {
  items: AnnouncementItem[];
  config: AnnouncementConfig;
}) {
  if (!config.enabled || items.length === 0) return null;

  const style = {
    background: config.background,
    color: config.color,
    "--kk-defilement": `${config.speedSeconds}s`,
  } as React.CSSProperties;

  const classesTexte =
    "text-[0.7rem] font-medium uppercase tracking-[0.2em] whitespace-nowrap";

  // Messages posés côte à côte, sans mouvement : choix du back-office, et
  // repli naturel quand une seule annonce tient largement dans la largeur.
  if (!config.scrolling) {
    return (
      <div style={style}>
        <div
          className={`mx-auto flex max-w-7xl flex-wrap items-center justify-center px-4 py-2 text-center ${classesTexte}`}
        >
          {items.map((item) => (
            <Message key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={style} className="overflow-hidden">
      {/*
        `aria-hidden` sur la copie : elle n'existe que pour combler le vide
        laissé par l'original pendant qu'il sort du cadre. L'annoncer deux fois
        ferait lire chaque message en double.

        `role="marquee"` n'existe pas ; on s'en tient à une région signalée,
        que les lecteurs d'écran restituent d'un bloc, sans mouvement.
      */}
      <div className="kk-marquee flex w-max py-2" role="region" aria-label="Annonces de la boutique">
        <div className={`flex shrink-0 items-center ${classesTexte}`}>
          {items.map((item) => (
            <Message key={item.id} item={item} />
          ))}
        </div>
        <div className={`flex shrink-0 items-center ${classesTexte}`} aria-hidden="true">
          {items.map((item) => (
            <Message key={`copie-${item.id}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
