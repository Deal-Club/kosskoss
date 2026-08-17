/**
 * Bascule des articles programmés.
 *
 * Même architecture que le répartiteur de campagnes : rien ne tourne en boucle
 * dans le processus. Un intervalle en mémoire disparaîtrait au moindre
 * redémarrage et laisserait un article programmé suspendu, sans que personne le
 * remarque. Une tâche planifiée extérieure appelle `/api/cron/journal` ; l'état
 * vit entièrement en base, un redémarrage ne coûte au pire qu'un tour de retard.
 *
 * Cette fonction n'est pas la seule protection : `isPubliclyVisible` sert déjà
 * les articles dont l'heure est passée, même si la tâche n'a jamais tourné.
 * Elle sert à rendre l'état de la base cohérent avec la réalité — pour que le
 * back-office affiche « Publié » et non « Programmé » sur un article visible,
 * et pour que le sitemap le reprenne.
 */

import { prisma } from "@/server/prisma";

export interface PublishDueResult {
  readonly published: number;
  readonly slugs: string[];
}

export async function publishDueArticles(now: Date = new Date()): Promise<PublishDueResult> {
  const due = await prisma.article.findMany({
    where: {
      deletedAt: null,
      status: "scheduled",
      scheduledAt: { lte: now, not: null },
    },
    select: { id: true, slug: true, scheduledAt: true },
  });

  if (due.length === 0) return { published: 0, slugs: [] };

  // La date retenue est l'heure PRÉVUE, pas l'heure du passage de la tâche :
  // un cron qui passe avec trois minutes de retard ne doit pas décaler la date
  // affichée au lecteur ni l'ordre du fil.
  await prisma.$transaction(
    due.map((article) =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          status: "published",
          publishedAt: article.scheduledAt ?? now,
          scheduledAt: null,
        },
      }),
    ),
  );

  return { published: due.length, slugs: due.map((article) => article.slug) };
}

/** Prochaine échéance, pour l'afficher dans le back-office. */
export async function nextScheduledAt(): Promise<Date | null> {
  const row = await prisma.article.findFirst({
    where: { deletedAt: null, status: "scheduled", scheduledAt: { not: null } },
    orderBy: { scheduledAt: "asc" },
    select: { scheduledAt: true },
  });
  return row?.scheduledAt ?? null;
}
