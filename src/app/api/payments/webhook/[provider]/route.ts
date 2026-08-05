import { NextResponse } from "next/server";
import { getGateway, isGatewayId } from "@/server/gateways";
import {
  getOrderByNumber,
  recordOrderEvent,
  setOrderGatewayReference,
  updatePaymentStatus,
} from "@/server/orders";

// Point d'entrée des notifications de paiement (webhooks).
//
// Un endpoint par prestataire : /api/payments/webhook/stripe, …/mollie, etc.
// C'est ici, et nulle part ailleurs, que l'état de paiement d'une commande
// bascule automatiquement — la redirection de retour du client, elle, ne prouve
// rien (il peut fermer l'onglet). L'adaptateur valide la signature ; sans elle,
// on répond 400 et le prestataire réessaiera.
//
// Runtime Node : la vérification de signature lit le corps brut de la requête.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ provider: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { provider } = await params;
  if (!isGatewayId(provider)) {
    return NextResponse.json({ error: "Prestataire inconnu." }, { status: 404 });
  }

  const gateway = getGateway(provider);

  let result;
  try {
    result = await gateway.handleWebhook(request);
  } catch (error) {
    // Signature invalide ou prestataire non configuré : trace serveur, réponse
    // 400 neutre. Le prestataire rejouera l'événement.
    console.error(`[webhook:${provider}]`, error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  // Événement sans effet sur le paiement (ex. un type qu'on n'exploite pas) :
  // on accuse réception pour que le prestataire ne le rejoue pas indéfiniment.
  if (!result.orderNumber || !result.paymentStatus) {
    return NextResponse.json({ received: true });
  }

  const order = await getOrderByNumber(result.orderNumber);
  if (!order) {
    // Commande introuvable : on accuse quand même réception, un rejeu ne
    // changerait rien.
    return NextResponse.json({ received: true });
  }

  if (result.reference) {
    await setOrderGatewayReference(order.id, result.reference);
  }

  // Contrôle du montant avant de déclarer une commande payée.
  //
  // La signature garantit que l'événement vient bien du prestataire, pas qu'il
  // porte sur la bonne somme. Un écart signale une anomalie qu'aucune signature
  // ne détecte : session rattachée au mauvais numéro de commande, paiement
  // partiel accepté, montant retouché dans le tableau de bord du prestataire.
  // Dans ce cas la commande reste en attente et un événement le consigne —
  // mieux vaut un règlement à vérifier à la main qu'une commande de 500 €
  // expédiée pour 5 € encaissés.
  //
  // Le contrôle ne porte que sur le passage en « payée » : un échec ou un
  // remboursement n'ont pas à correspondre au total.
  if (result.paymentStatus === "bezahlt") {
    const montantAnnonce = result.amountCents;
    const deviseAnnoncee = result.currency?.toUpperCase();

    const montantDiscordant = montantAnnonce !== undefined && montantAnnonce !== order.totalCents;
    const deviseDiscordante =
      deviseAnnoncee !== undefined && deviseAnnoncee !== order.currency.toUpperCase();

    if (montantDiscordant || deviseDiscordante) {
      const attendu = `${order.totalCents} ${order.currency.toUpperCase()}`;
      const recu = `${montantAnnonce ?? "?"} ${deviseAnnoncee ?? "?"}`;
      console.error(
        `[webhook:${provider}] montant discordant sur ${order.orderNumber} — attendu ${attendu}, reçu ${recu}`,
      );
      // La commande reste dans l'état où elle est ; l'anomalie est consignée
      // dans son historique pour que le commerçant la voie dans le back-office
      // et tranche lui-même.
      await recordOrderEvent(
        order.id,
        "payment",
        `Paiement reçu pour un montant différent du total : attendu ${attendu}, reçu ${recu}. Commande laissée en attente, à vérifier manuellement.`,
        `webhook:${provider}`,
      );
      // 200 volontaire : l'événement a bien été reçu et traité. Répondre 400
      // ferait rejouer indéfiniment une notification que le prestataire, lui, a
      // émise correctement.
      return NextResponse.json({ received: true, amountMismatch: true });
    }
  }

  // Idempotence : ne repasser le statut que s'il change réellement. Un webhook
  // rejoué sur une commande déjà « payée » ne crée pas d'événement en double.
  if (order.paymentStatus !== result.paymentStatus) {
    await updatePaymentStatus(
      order.id,
      result.paymentStatus,
      `webhook:${provider}`,
      result.reference ? `Réf. prestataire : ${result.reference}` : undefined,
    );
  }

  return NextResponse.json({ received: true });
}
