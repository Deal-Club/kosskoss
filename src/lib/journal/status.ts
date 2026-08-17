/**
 * Cycle de vie d'un article.
 *
 * La publication programmée repose sur DEUX mécanismes, volontairement
 * redondants :
 *
 *  1. `dueForPublication` — la tâche planifiée (`/api/cron/journal`) bascule
 *     les articles dont l'heure est venue, comme le fait déjà le répartiteur de
 *     campagnes. L'état vit en base, jamais dans un intervalle en mémoire qui
 *     disparaîtrait au premier redémarrage.
 *
 *  2. `isPubliclyVisible` — la boutique ne sert un article que si sa date est
 *     passée, que la tâche ait tourné ou non. Si le cron n'est pas branché,
 *     rien ne fuite ; s'il a du retard, l'article sort quand même à la première
 *     visite. Une fonctionnalité qui dépend d'un ordonnanceur externe ne doit
 *     jamais échouer en silence.
 */

import type { ArticleStatus } from "@/types/journal";

export interface VisibilityInput {
  readonly status: ArticleStatus;
  readonly publishedAt: Date | null;
  readonly deletedAt: Date | null;
}

/** Ce que la boutique accepte de servir. Aucune autre condition ailleurs. */
export function isPubliclyVisible(article: VisibilityInput, now: Date): boolean {
  if (article.deletedAt) return false;
  if (article.status !== "published") return false;
  if (!article.publishedAt) return false;
  return article.publishedAt.getTime() <= now.getTime();
}

export interface ScheduleInput {
  readonly status: ArticleStatus;
  readonly scheduledAt: Date | null;
}

/** Article programmé dont l'heure est venue. */
export function dueForPublication(article: ScheduleInput, now: Date): boolean {
  if (article.status !== "scheduled") return false;
  if (!article.scheduledAt) return false;
  return article.scheduledAt.getTime() <= now.getTime();
}

export interface PublicationInput {
  readonly status: ArticleStatus;
  readonly scheduledAt: Date | null;
  readonly publishedAt: Date | null;
}

export interface PublicationFields {
  readonly status: ArticleStatus;
  readonly publishedAt: Date | null;
  readonly scheduledAt: Date | null;
}

/**
 * Met en cohérence statut et dates avant écriture.
 *
 * Le cas qui justifie cette fonction : un administrateur programme un article
 * pour une heure déjà passée. Le laisser en « programmé » l'aurait suspendu
 * jusqu'au prochain passage de la tâche — ou pour toujours. Il est publié tout
 * de suite, à la date demandée.
 */
export function resolvePublication(input: PublicationInput, now: Date): PublicationFields {
  switch (input.status) {
    case "published":
      return {
        status: "published",
        publishedAt: input.publishedAt ?? now,
        scheduledAt: null,
      };

    case "scheduled": {
      // Une programmation sans date n'est pas une programmation.
      if (!input.scheduledAt) {
        return { status: "draft", publishedAt: null, scheduledAt: null };
      }
      if (input.scheduledAt.getTime() <= now.getTime()) {
        return { status: "published", publishedAt: input.scheduledAt, scheduledAt: null };
      }
      return { status: "scheduled", publishedAt: null, scheduledAt: input.scheduledAt };
    }

    case "archived":
      // L'archive garde sa date d'origine : elle documente quand l'article a
      // vécu, et la restaurer ne doit pas le faire remonter en tête de liste.
      return { status: "archived", publishedAt: input.publishedAt, scheduledAt: null };

    case "draft":
      return { status: "draft", publishedAt: null, scheduledAt: null };
  }
}
