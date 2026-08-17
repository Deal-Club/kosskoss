/**
 * Signal de lecture d'un article.
 *
 * Seule route publique en écriture du Journal, donc la seule à mériter un
 * paragraphe sur ce qu'elle ne fait pas :
 *
 *  - elle ne renvoie jamais 404 sur un slug inconnu. Répondre différemment
 *    selon qu'un slug existe ou non transformerait ce compteur en moyen de
 *    deviner les brouillons ; elle répond toujours « c'est noté », et ignore
 *    en silence ce qui n'est pas public ;
 *  - elle ne fait rien qui coûte cher : un article introuvable s'arrête à une
 *    lecture indexée sur le slug.
 *
 * Le dédoublonnage sérieux se fait côté client (`sessionStorage`) : un même
 * lecteur qui rafraîchit sa page ne compte qu'une fois par session. Le frein
 * ci-dessous ne sert qu'à empêcher qu'on gonfle un compteur en boucle.
 */

import { NextResponse } from "next/server";
import { recordArticleView } from "@/server/journal/counter";

export const runtime = "nodejs";

/** Un même client ne compte qu'une vue par article et par minute. */
const WINDOW_MS = 60 * 1000;
const seen = new Map<string, number>();

/**
 * Purge opportuniste : sans elle, la table grossirait indéfiniment sur un
 * serveur de longue durée. Elle est faite à l'écriture, il n'y a donc aucun
 * minuteur qui tourne en tâche de fond.
 */
function remember(key: string, now: number): boolean {
  if (seen.size > 10_000) {
    for (const [entry, at] of seen) {
      if (now - at > WINDOW_MS) seen.delete(entry);
    }
  }

  const last = seen.get(key);
  if (last && now - last < WINDOW_MS) return false;
  seen.set(key, now);
  return true;
}

function clientKey(request: Request, slug: string): string {
  // Derrière un reverse proxy, la première adresse de la chaîne est celle du
  // client. Sans en-tête, tous les appels partagent la même clé : le frein
  // devient global, ce qui reste préférable à pas de frein du tout.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "inconnu";
  return `${ip}|${slug}`;
}

type Params = Promise<{ slug: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { slug } = await params;
  if (!slug || slug.length > 200) {
    return NextResponse.json({ recorded: false });
  }

  if (!remember(clientKey(request, slug), Date.now())) {
    return NextResponse.json({ recorded: false });
  }

  try {
    await recordArticleView(slug);
  } catch {
    // Un compteur de vues ne doit jamais faire échouer une lecture.
  }

  return NextResponse.json({ recorded: true });
}
