import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { lireConfig, lirePaiement } from "@/server/gateways/cinetpay";
import { appliquerEvenement, commandeDepuisReferenceCinetpay } from "@/server/kk/paiement";

/**
 * Notifications de paiement CinetPay.
 *
 * ── LA NOTIFICATION N'EST QU'UN DÉCLENCHEUR, JAMAIS UNE PREUVE ─────────────
 *
 * Avertissement explicite en tête de leur documentation « Notification » :
 * n'importe qui connaissant l'URL peut forger un faux `notify_token`/statut
 * — la SEULE source de vérité est un appel serveur-à-serveur authentifié
 * (`GET /v1/payment/{merchant_transaction_id}`, jeton Bearer). Cette route
 * lit `merchant_transaction_id` dans le corps reçu — rien d'autre, surtout
 * pas un statut — puis interroge CinetPay elle-même. La conclusion vient de
 * CETTE réponse, jamais du corps de la notification.
 *
 * L'idempotence (une notification rejouée, ce que leur documentation dit
 * explicitement pouvoir arriver, ne doit ni ré-encaisser ni renvoyer deux
 * fois la conversion Meta) est posée dans `appliquerEvenement` lui-même, sur
 * l'état déjà enregistré de la transaction — voir son commentaire. Cette
 * route n'a donc pas besoin d'un verrou de livraison comme la route
 * GeniusPay : `WebhookEvent` n'y sert que de journal, pas de verrou.
 *
 * Leur montant n'est PAS renvoyé par `/v1/payment/{id}` (voir
 * gateways/cinetpay.ts) : le recoupement de montant d'`appliquerEvenement`
 * porte donc ici sur le montant que NOUS avons nous-mêmes enregistré à
 * l'ouverture (`PaymentTransaction.amount`), pas sur une valeur renvoyée par
 * CinetPay — un filet contre une erreur d'écriture locale, pas contre une
 * falsification de leur côté, qu'un Bearer serveur-à-serveur rend de toute
 * façon improbable.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER = "cinetpay" as const;

function erreur(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * CinetPay poste un corps JSON :
 * `{ notify_token, merchant_transaction_id, transaction_id, user }`.
 * `merchant_transaction_id` est notre propre référence (voir
 * `ouvrirPaiement`) — c'est elle qui retrouve la commande, jamais
 * `transaction_id` (généré côté CinetPay, jamais stocké de notre côté).
 */
async function litIdentifiantMarchand(request: Request): Promise<string> {
  try {
    const corps = (await request.json()) as { merchant_transaction_id?: unknown };
    return typeof corps.merchant_transaction_id === "string" ? corps.merchant_transaction_id : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const config = lireConfig();
  if (!config) {
    console.error("[webhook:cinetpay] CINETPAY_API_KEY/CINETPAY_API_PASSWORD absents");
    return erreur(503, "Service Unavailable");
  }

  const transactionId = await litIdentifiantMarchand(request);
  if (!transactionId) {
    return erreur(400, "Missing merchant_transaction_id");
  }

  // Journal de passage — voir l'en-tête de fichier : ce n'est PAS le verrou
  // d'idempotence, seulement une trace pour le service client. L'identifiant
  // est donc généré ici, sans essayer de retrouver un identifiant stable que
  // CinetPay ne fournit pas.
  await prisma.webhookEvent
    .create({
      data: {
        provider: PROVIDER,
        deliveryId: `${transactionId}-${Date.now()}-${randomUUID().slice(0, 8)}`,
        event: "notify",
        reference: transactionId,
        payload: transactionId,
        status: "recu",
      },
    })
    .catch(() => {
      // Un échec d'écriture du journal ne doit pas empêcher la vérification
      // du paiement — elle reste la partie qui compte.
    });

  const [verification, transactionConnue] = await Promise.all([
    lirePaiement(config, transactionId),
    prisma.paymentTransaction.findUnique({ where: { reference: transactionId }, select: { amount: true } }),
  ]);
  if (!verification) {
    // CinetPay réessaiera sur un 5xx ; c'est ce qu'on veut si LEUR API de
    // vérification était momentanément indisponible.
    console.error("[webhook:cinetpay] vérification impossible", { transactionId });
    return erreur(502, "Verification failed");
  }

  try {
    const issue = await appliquerEvenement({
      provider: PROVIDER,
      reference: transactionId,
      statut: verification.statut,
      // Voir l'en-tête de fichier : leur API de vérification ne renvoie pas
      // le montant. `?? 0` ne se produit qu'en THÉORIE (webhook arrivé pour
      // une transaction que `ouvrirPaiement` n'aurait pas enregistrée) —
      // `appliquerEvenement` refuse alors d'encaisser plutôt que de
      // recouper contre zéro, ce qui est le comportement voulu.
      montant: transactionConnue?.amount ?? 0,
      orderNumber: commandeDepuisReferenceCinetpay(transactionId),
      brut: verification.brut,
    });

    return NextResponse.json({ success: true, issue });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[webhook:cinetpay] traitement échoué", message);
    // 500 : CinetPay réessaiera. La prochaine notification revérifiera le
    // statut depuis leur API — rejouable sans risque, voir l'en-tête.
    return erreur(500, "Internal Server Error");
  }
}
