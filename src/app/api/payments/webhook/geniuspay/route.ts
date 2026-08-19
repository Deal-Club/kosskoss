import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import {
  horodatageAcceptable,
  lireConfig,
  verifierSignature,
} from "@/server/gateways/geniuspay";
import { appliquerEvenement, PROVIDER } from "@/server/kk/paiement";

/**
 * Notifications de paiement GeniusPay.
 *
 * C'est ICI, et nulle part ailleurs, que l'état de paiement d'une commande
 * bascule. Le retour du client sur la page de confirmation ne prouve rien : il
 * peut fermer l'onglet avant de payer, ou revenir sans avoir payé.
 *
 * ── L'ORDRE DES CONTRÔLES N'EST PAS ARBITRAIRE ──────────────────────────────
 *
 *  1. Signature — sans elle, n'importe qui peut se déclarer payé.
 *  2. Horodatage — une requête authentique capturée hier reste signée ; seul
 *     l'horodatage la démasque.
 *  3. Idempotence — AVANT tout traitement. GeniusPay réessaie cinq fois
 *     (immédiat, 5 min, 30 min, 2 h, 6 h) ; sans ce verrou, un traitement lent
 *     qui répond 500 après avoir travaillé encaisse deux fois.
 *  4. Traitement.
 *
 * Le corps est lu en TEXTE BRUT et jamais re-sérialisé : `JSON.stringify` d'un
 * objet reparsé ne rend pas les octets d'origine — ordre des clés, espaces,
 * échappements — et la signature ne correspondrait plus.
 *
 * Runtime Node : la vérification de signature a besoin de `node:crypto`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Réponses d'erreur au format que leur documentation attend (RFC 7807).
 * Un 5xx ou un délai dépassé déclenche leurs relances ; un 400 ou un 401, non.
 */
function erreur(status: number, title: string, detail: string) {
  return NextResponse.json(
    { type: "about:blank", title, status, detail, instance: "/api/payments/webhook/geniuspay" },
    { status },
  );
}

export async function POST(request: Request) {
  const config = lireConfig();
  if (!config?.webhookSecret) {
    // Sans secret configuré, on ne peut rien vérifier — et traiter un webhook
    // non vérifié serait pire que le refuser.
    console.error("[webhook:geniuspay] GENIUSPAY_WEBHOOK_SECRET absent");
    return erreur(503, "Service Unavailable", "Webhook not configured");
  }

  // Les deux documentations du prestataire nomment les en-têtes différemment.
  // On accepte les deux jeux plutôt que de parier sur le bon.
  const entete = (...noms: string[]): string =>
    noms.map((n) => request.headers.get(n)).find((v) => v) ?? "";

  const signature = entete("x-webhook-signature", "x-geniuspay-signature");
  const timestamp = entete("x-webhook-timestamp", "x-geniuspay-timestamp");
  const evenementNom = entete("x-webhook-event", "x-geniuspay-event");

  if (!signature || !timestamp || !evenementNom) {
    return erreur(400, "Bad Request", "Required header is not present.");
  }

  const corpsBrut = await request.text();

  if (!verifierSignature(corpsBrut, signature, timestamp, config.webhookSecret)) {
    console.warn("[webhook:geniuspay] signature invalide", { evenement: evenementNom });
    return erreur(401, "Unauthorized", "Invalid signature");
  }

  if (!horodatageAcceptable(timestamp)) {
    console.warn("[webhook:geniuspay] horodatage hors tolérance", { timestamp });
    return erreur(400, "Bad Request", "Timestamp too old");
  }

  let corps: Record<string, unknown>;
  try {
    corps = JSON.parse(corpsBrut) as Record<string, unknown>;
  } catch {
    return erreur(400, "Bad Request", "Malformed JSON body");
  }

  // Identifiant de livraison : l'en-tête quand il est là, sinon l'`id` du
  // corps. Les deux sont documentés comme uniques ; le second sert de repli
  // parce que l'en-tête est marqué « optionnel ».
  const deliveryId =
    entete("x-webhook-delivery") || (typeof corps.id === "string" ? corps.id : "");
  if (!deliveryId) {
    // Sans identifiant, aucune idempotence possible. On refuse plutôt que de
    // risquer un double encaissement à la première relance.
    return erreur(400, "Bad Request", "Missing delivery identifier");
  }

  const donnees = (corps.data ?? {}) as Record<string, unknown>;
  const reference = String(donnees.reference ?? "");

  // ── Verrou d'idempotence ──────────────────────────────────────────────────
  // L'insertion elle-même fait le verrou : `deliveryId` est UNIQUE, donc une
  // seconde livraison échoue à l'écriture. Un `findFirst` suivi d'un `create`
  // laisserait passer deux relances simultanées entre la lecture et l'écriture.
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: PROVIDER,
        deliveryId,
        event: evenementNom,
        reference,
        payload: corpsBrut.slice(0, 8000),
        status: "recu",
      },
    });
  } catch {
    // Déjà reçu : on accuse réception sans retraiter. Répondre 200 est
    // essentiel — un 4xx ferait relancer le prestataire indéfiniment.
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  // Les tests de webhook n'ont pas de transaction associée.
  if (evenementNom === "webhook.test") {
    await marquer(deliveryId, "ignore");
    return NextResponse.json({ success: true, message: "Test received" });
  }

  try {
    const issue = await appliquerEvenement({
      reference,
      statut: String(donnees.status ?? ""),
      montant: Math.round(Number(donnees.amount ?? 0)),
      orderNumber: String(
        (donnees.metadata as Record<string, unknown> | undefined)?.order_id ?? "",
      ),
      brut: corpsBrut.slice(0, 4000),
    });

    await marquer(deliveryId, issue === "encaisse" || issue === "echoue" ? "traite" : "ignore");

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[webhook:geniuspay] traitement échoué", message);
    await marquer(deliveryId, "erreur", message);

    // 500 : le prestataire réessaiera, et le verrou d'idempotence est déjà
    // posé — la relance retombera sur « Already processed ». C'est voulu :
    // l'événement est archivé en base avec son erreur, la reprise se fait à la
    // main depuis le back-office plutôt qu'en boucle automatique sur un bogue.
    return erreur(500, "Internal Server Error", "Failed to process webhook");
  }
}

async function marquer(deliveryId: string, status: string, error = ""): Promise<void> {
  await prisma.webhookEvent.update({
    where: { deliveryId },
    data: { status, error: error.slice(0, 1000), processedAt: new Date() },
  });
}
