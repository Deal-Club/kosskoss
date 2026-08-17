/**
 * Bascule des articles programmés.
 *
 * Même architecture, et même garde-fou, que `/api/cron/campaigns` : rien ne
 * tourne en boucle dans le processus, une tâche planifiée extérieure appelle
 * cette route, l'état vit entièrement en base.
 *
 * Cette route n'est PAS ce qui rend un article visible : `isPubliclyVisible`
 * sert déjà tout article dont l'heure est passée. Elle met l'état de la base en
 * accord avec la réalité — pour que le back-office affiche « Publié », que le
 * sitemap reprenne l'article et que le cache soit invalidé au bon moment.
 *
 * Exemple de tâche planifiée (Coolify, cron système) :
 *   *\/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *       https://kosskoss.example/api/cron/journal > /dev/null
 *
 * Toutes les cinq minutes suffisent : une programmation éditoriale ne se joue
 * pas à la seconde, et le filtre de lecture couvre l'intervalle.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { publishDueArticles } from "@/server/journal/schedule";
import { revalidateJournal } from "@/server/journal/revalidate";

export const dynamic = "force-dynamic";

/**
 * Comparaison à temps constant. Les deux valeurs passent par une empreinte
 * SHA-256 avant d'être comparées : `timingSafeEqual` exige des tampons de même
 * longueur, et comparer les longueurs à part révélerait déjà celle du secret.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function readProvidedSecret(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (bearer) return bearer;
  return new URL(request.url).searchParams.get("secret")?.trim() ?? "";
}

async function publishAndRevalidate() {
  const result = await publishDueArticles();
  if (result.published > 0) {
    for (const slug of result.slugs) revalidateJournal(slug);
  }
  return result;
}

async function handle(request: Request) {
  const expected = process.env.CRON_SECRET?.trim() ?? "";

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET n'est pas configuré : le déclencheur est désactivé." },
        { status: 503 },
      );
    }
    const result = await publishAndRevalidate();
    return NextResponse.json({
      warning: "CRON_SECRET absent : route ouverte en développement uniquement.",
      ...result,
    });
  }

  const provided = readProvidedSecret(request);
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  return NextResponse.json(await publishAndRevalidate());
}

export async function POST(request: Request) {
  return handle(request);
}

/** Toléré : beaucoup d'ordonnanceurs simples ne savent émettre qu'un GET. */
export async function GET(request: Request) {
  return handle(request);
}
