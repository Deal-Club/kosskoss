import { cache } from "react";
import { prisma } from "@/server/prisma";

/**
 * Bandeau d'annonce défilant.
 *
 * Les messages vivent dans leur propre table — on en ajoute, on en retire, on
 * les réordonne. Les réglages d'apparence, eux, sont uniques pour tout le site
 * et tiennent dans une ligne de `Setting` sérialisée en JSON : une table de
 * configuration à un seul enregistrement n'aurait apporté qu'une jointure.
 *
 * Rien n'est écrit en dur ici : couleurs, vitesse et activation viennent tous
 * du back-office, avec des valeurs de repli qui reprennent la charte.
 */

const CLE_REGLAGES = "announcement.config";

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

export const getAnnouncementConfig = cache(async (): Promise<AnnouncementConfig> => {
  try {
    const ligne = await prisma.setting.findUnique({ where: { key: CLE_REGLAGES } });
    if (!ligne) return REGLAGES_PAR_DEFAUT;
    return normaliserReglages(JSON.parse(ligne.value));
  } catch {
    // Ligne absente ou JSON abîmé : la boutique garde son bandeau par défaut.
    return REGLAGES_PAR_DEFAUT;
  }
});

export async function saveAnnouncementConfig(
  reglages: Partial<AnnouncementConfig>,
): Promise<AnnouncementConfig> {
  const actuels = await getAnnouncementConfig();
  const fusion = normaliserReglages({ ...actuels, ...reglages });

  await prisma.setting.upsert({
    where: { key: CLE_REGLAGES },
    create: { key: CLE_REGLAGES, value: JSON.stringify(fusion) },
    update: { value: JSON.stringify(fusion) },
  });
  return fusion;
}

/** Messages affichés en boutique : actifs seulement, dans l'ordre choisi. */
export const getActiveAnnouncements = cache(async (): Promise<AnnouncementItem[]> => {
  const lignes = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return lignes.map((l) => ({
    id: l.id,
    message: l.message,
    icon: l.icon,
    active: l.active,
    position: l.position,
  }));
});

/** Tous les messages, actifs ou non — vue du back-office. */
export async function listAnnouncements(): Promise<AnnouncementItem[]> {
  const lignes = await prisma.announcement.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return lignes.map((l) => ({
    id: l.id,
    message: l.message,
    icon: l.icon,
    active: l.active,
    position: l.position,
  }));
}

export interface AnnouncementInput {
  message: string;
  icon?: string;
  active?: boolean;
  position?: number;
}

function nettoyerMessage(valeur: unknown): string {
  return String(valeur ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export async function createAnnouncement(entree: AnnouncementInput): Promise<AnnouncementItem> {
  const message = nettoyerMessage(entree.message);
  if (!message) throw new Error("Le message est obligatoire.");

  // Placé en fin de liste : l'ordre d'ajout est le plus prévisible pour qui
  // administre, et le réordonnancement se fait ensuite à la souris.
  const dernier = await prisma.announcement.findFirst({ orderBy: { position: "desc" } });

  const cree = await prisma.announcement.create({
    data: {
      message,
      icon: String(entree.icon ?? "sparkles").slice(0, 40),
      active: entree.active !== false,
      position: (dernier?.position ?? 0) + 1,
    },
  });
  return { id: cree.id, message: cree.message, icon: cree.icon, active: cree.active, position: cree.position };
}

export async function updateAnnouncement(
  id: string,
  entree: Partial<AnnouncementInput>,
): Promise<AnnouncementItem | null> {
  const existe = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;

  const modifie = await prisma.announcement.update({
    where: { id },
    data: {
      ...(entree.message !== undefined ? { message: nettoyerMessage(entree.message) } : {}),
      ...(entree.icon !== undefined ? { icon: String(entree.icon).slice(0, 40) } : {}),
      ...(entree.active !== undefined ? { active: Boolean(entree.active) } : {}),
      ...(entree.position !== undefined ? { position: Number(entree.position) } : {}),
    },
  });
  return {
    id: modifie.id,
    message: modifie.message,
    icon: modifie.icon,
    active: modifie.active,
    position: modifie.position,
  };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await prisma.announcement.deleteMany({ where: { id } });
}

/** Réordonne d'après la liste d'identifiants reçue, dans l'ordre donné. */
export async function reorderAnnouncements(ids: string[]): Promise<AnnouncementItem[]> {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.announcement.updateMany({ where: { id }, data: { position: index + 1 } }),
    ),
  );
  return listAnnouncements();
}
