/**
 * Bandeau d'annonce — types et logique pure.
 *
 * Séparé de `src/server/announcements.ts` parce que le back-office est un
 * composant client : lui faire importer le module serveur y tirerait Prisma,
 * donc le driver `pg`, donc `tls` et `util/types` — que le navigateur n'a pas.
 * Ici, aucune dépendance : ce fichier traverse la frontière sans rien emporter.
 */

export interface AnnouncementItem {
  id: string;
  message: string;
  /** Nom d'une icône lucide-react ; vide = pas d'icône. */
  icon: string;
  active: boolean;
  position: number;
}

export interface AnnouncementConfig {
  /** Faux : le bandeau disparaît entièrement du site. */
  enabled: boolean;
  /** Couleur de fond, en hexadécimal. */
  background: string;
  /** Couleur du texte, en hexadécimal. */
  color: string;
  /**
   * Durée d'un cycle complet de défilement, en secondes. Plus le nombre est
   * grand, plus le texte glisse lentement.
   */
  speedSeconds: number;
  /**
   * Faux : les messages sont posés côte à côte, sans mouvement. Utile quand il
   * n'y a qu'une annonce, ou pour un bandeau qui doit rester lisible d'un coup.
   */
  scrolling: boolean;
}

/** Repli : la charte KossKoss, bleu profond et crème. */
export const REGLAGES_PAR_DEFAUT: AnnouncementConfig = {
  enabled: true,
  background: "#0F3B46",
  color: "#F3E8DD",
  speedSeconds: 30,
  scrolling: true,
};

/** Bornes de vitesse : en deçà le texte est illisible, au-delà il semble figé. */
export const VITESSE_MIN = 8;
export const VITESSE_MAX = 120;

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Relit les réglages en tolérant tout : une valeur absente, mal typée ou hors
 * bornes retombe sur le défaut. Le bandeau est la première chose que voit un
 * visiteur — il ne doit jamais casser la page parce qu'une couleur a été mal
 * saisie.
 */
export function normaliserReglages(brut: unknown): AnnouncementConfig {
  const source = (brut ?? {}) as Record<string, unknown>;
  const vitesse = Number(source.speedSeconds);

  return {
    enabled: source.enabled !== false,
    background: HEX.test(String(source.background))
      ? String(source.background)
      : REGLAGES_PAR_DEFAUT.background,
    color: HEX.test(String(source.color)) ? String(source.color) : REGLAGES_PAR_DEFAUT.color,
    speedSeconds: Number.isFinite(vitesse)
      ? Math.min(VITESSE_MAX, Math.max(VITESSE_MIN, Math.round(vitesse)))
      : REGLAGES_PAR_DEFAUT.speedSeconds,
    scrolling: source.scrolling !== false,
  };
}
