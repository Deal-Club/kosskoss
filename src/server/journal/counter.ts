/**
 * Compteur de vues.
 *
 * La contrainte vient du rendu, pas du besoin : les pages de la boutique sont
 * générées statiquement (voir `next.config.ts`, quatre workers, base Neon
 * mise en veille). Compter une vue PENDANT le rendu rendrait chaque article
 * dynamique et coûterait une écriture en base à chaque visite — on paierait un
 * chiffre indicatif au prix du cache de tout le Journal.
 *
 * D'où ce découpage :
 *   - la page reste statique ;
 *   - un composant client envoie un signal après affichage, dédoublonné par
 *     `sessionStorage` ;
 *   - cette fonction agrège par JOUR (une ligne par article et par jour) et
 *     tient à jour le compteur dénormalisé `Article.viewCount`, seul lu par
 *     « les plus lus ».
 *
 * Une table d'événements « une ligne par visite » grossirait sans fin pour une
 * information que personne ne consulte à la visite près.
 */

import { prisma } from "@/server/prisma";

/** Minuit UTC du jour d'une date : la clé de l'agrégat. */
export function dayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Enregistre une vue.
 *
 * Rend `false` si le slug n'existe pas ou n'est pas public : un signal portant
 * un slug inconnu est ignoré en silence, sans révéler l'existence d'un
 * brouillon ni créer de ligne parasite.
 */
export async function recordArticleView(slug: string, now: Date = new Date()): Promise<boolean> {
  const article = await prisma.article.findFirst({
    where: { slug, deletedAt: null, status: "published", publishedAt: { lte: now } },
    select: { id: true },
  });
  if (!article) return false;

  const day = dayKey(now);

  // Les deux écritures vont ensemble : un total qui diverge du détail rendrait
  // les deux inexploitables.
  await prisma.$transaction([
    prisma.articleViewDay.upsert({
      where: { articleId_day: { articleId: article.id, day } },
      update: { count: { increment: 1 } },
      create: { articleId: article.id, day, count: 1 },
    }),
    prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    }),
  ]);

  return true;
}

export interface ViewPoint {
  readonly day: Date;
  readonly count: number;
}

/** Historique d'un article, pour le back-office. */
export async function articleViewHistory(articleId: string, days: number): Promise<ViewPoint[]> {
  const since = dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const rows = await prisma.articleViewDay.findMany({
    where: { articleId, day: { gte: since } },
    orderBy: { day: "asc" },
    select: { day: true, count: true },
  });
  return rows;
}
