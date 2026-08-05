/**
 * Déclencheur de l'envoi des campagnes.
 *
 * Le répartiteur ne tourne pas en boucle dans le processus : un intervalle en
 * mémoire disparaîtrait au moindre redémarrage et laisserait une campagne
 * figée à moitié envoyée, sans que personne le remarque. Une tâche planifiée
 * extérieure appelle cette route chaque minute ; l'état vit entièrement en
 * base, donc un redémarrage ne coûte au pire qu'une minute de retard.
 *
 * Appeler la route plus souvent que nécessaire est sans effet : le répartiteur
 * ne fait rien tant que l'heure du prochain lot n'est pas atteinte.
 *
 * Exemple de tâche planifiée (Coolify, cron système) :
 *   * * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *       https://mlc-bois.fr/api/cron/campaigns > /dev/null
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchDueCampaigns } from "@/server/campaignDispatcher";

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

  // Certains ordonnanceurs ne savent poser aucun en-tête : le paramètre de
  // requête reste toléré. Il apparaît en revanche dans les journaux d'accès,
  // d'où la préférence pour l'en-tête.
  return new URL(request.url).searchParams.get("secret")?.trim() ?? "";
}

async function handle(request: Request) {
  const expected = process.env.CRON_SECRET?.trim() ?? "";

  if (!expected) {
    // En production, une route qui déclenche des envois ne reste pas ouverte
    // parce qu'une variable manque.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET n'est pas configuré : le déclencheur est désactivé." },
        { status: 503 },
      );
    }
    const reports = await dispatchDueCampaigns();
    return NextResponse.json({
      warning: "CRON_SECRET absent : route ouverte en développement uniquement.",
      dispatched: reports.length,
      reports,
    });
  }

  const provided = readProvidedSecret(request);
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const reports = await dispatchDueCampaigns();
  return NextResponse.json({ dispatched: reports.length, reports });
}

export async function POST(request: Request) {
  return handle(request);
}

/** Toléré : beaucoup d'ordonnanceurs simples ne savent émettre qu'un GET. */
export async function GET(request: Request) {
  return handle(request);
}
