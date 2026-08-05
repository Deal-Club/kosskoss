import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createOrder,
  OrderError,
  parseCheckoutPayload,
  setOrderGatewayReference,
} from "@/server/orders";
import type { CheckoutErrorCode, OrderRecord } from "@/server/orders";
import { getCurrentCustomer } from "@/server/customerSession";
import { resolveCampaignContext } from "@/server/campaignContext";
import { sendOrderEmails } from "@/server/orderNotifications";
import { resolveGatewayForMethod } from "@/server/gateways";

/**
 * URL absolue et localisée de la page de confirmation. Le français vit à la
 * racine, l'anglais sous /en (localePrefix « as-needed ») : la redirection de
 * retour du prestataire doit respecter ce préfixe.
 */
function confirmationUrl(order: OrderRecord): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const prefix = order.locale === "en" ? "/en" : "";
  return `${base}${prefix}/confirmation/${order.orderNumber}?token=${order.accessToken}`;
}

/**
 * Ouvre une session de paiement si le moyen choisi est encaissé en ligne, et
 * rend l'URL vers laquelle rediriger le navigateur. Ne lève jamais : la commande
 * est déjà écrite (statut « offen »), donc un prestataire injoignable la laisse
 * réglable autrement plutôt que de casser une commande valable.
 */
async function startOnlinePayment(order: OrderRecord): Promise<string | undefined> {
  const gateway = await resolveGatewayForMethod(order.paymentMethodKey);
  if (!gateway) return undefined;

  try {
    const confirmation = confirmationUrl(order);
    const session = await gateway.createCheckoutSession({
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      amountCents: order.totalCents,
      currency: order.currency,
      email: order.email,
      locale: order.locale === "en" ? "en" : "fr",
      description: `Commande ${order.orderNumber}`,
      successUrl: confirmation,
      // Retour d'abandon distinct du retour de succès : sans ce marqueur, un
      // client qui renonce sur la page du prestataire revenait sur un écran
      // titré « Merci pour votre commande », alors que rien n'a été encaissé.
      // La page de confirmation s'appuie d'abord sur le statut réel de la
      // commande — un onglet fermé sans clic ne repasse par aucune de ces deux
      // URL — et ce paramètre ne fait qu'affiner le message.
      cancelUrl: `${confirmation}&paiement=interrompu`,
    });
    await setOrderGatewayReference(order.id, session.reference);
    return session.redirectUrl;
  } catch (error) {
    console.error("[checkout] initialisation du paiement en ligne impossible:", error);
    return undefined;
  }
}

// Point d'entrée public du tunnel de commande.
//
// Rien de ce que le navigateur envoie n'est repris tel quel en dehors des
// coordonnées : les identifiants de produit servent à relire les prix et le
// stock en base, les montants sont recalculés côté serveur, et le moyen de
// paiement doit figurer parmi ceux activés dans le back-office.
//
// La route reste ouverte aux visiteurs sans compte : commander en tant
// qu'invité est la règle, pas une tolérance. Si un cookie de session client
// valide accompagne la requête, la commande est simplement rattachée au compte
// correspondant.

/** Messages neutres, doublés en français et en anglais : le client affiche sa propre traduction à partir du code. */
const MESSAGES: Record<CheckoutErrorCode, { fr: string; en: string }> = {
  invalid_payload: {
    fr: "La commande n'a pas pu être lue.",
    en: "The order could not be read.",
  },
  cart_empty: { fr: "Votre panier est vide.", en: "Your cart is empty." },
  cart_too_large: {
    fr: "Votre panier contient trop d'articles différents.",
    en: "Your cart contains too many different items.",
  },
  invalid_quantity: {
    fr: "Merci de choisir une quantité entre 1 et 20 par article.",
    en: "Please choose a quantity between 1 and 20 per item.",
  },
  invalid_email: {
    fr: "Merci d'indiquer une adresse e-mail valide.",
    en: "Please enter a valid email address.",
  },
  invalid_name: {
    fr: "Merci d'indiquer vos nom et prénom.",
    en: "Please enter a first and last name.",
  },
  invalid_street: {
    fr: "Merci d'indiquer le numéro et le nom de la rue.",
    en: "Please enter a street and house number.",
  },
  invalid_postal_code: {
    fr: "Merci d'indiquer un code postal valide.",
    en: "Please enter a valid postcode.",
  },
  invalid_city: { fr: "Merci d'indiquer une ville.", en: "Please enter a city." },
  unsupported_country: {
    fr: "Merci d'indiquer un pays valide.",
    en: "Please enter a valid country.",
  },
  invalid_phone: {
    fr: "Merci d'indiquer un numéro de téléphone valide.",
    en: "Please enter a valid phone number.",
  },
  invalid_payment_method: {
    fr: "Merci de choisir un moyen de paiement disponible.",
    en: "Please choose an available payment method.",
  },
  invalid_shipping_method: {
    fr: "Merci de choisir un mode de livraison disponible.",
    en: "Please choose an available shipping method.",
  },
  terms_required: {
    fr: "Merci d'accepter les conditions générales de vente.",
    en: "Please accept the terms.",
  },
  withdrawal_required: {
    fr: "Merci de confirmer les informations sur le droit de rétractation.",
    en: "Please confirm the withdrawal policy.",
  },
  product_unavailable: {
    fr: "Un article de votre panier n'est plus disponible.",
    en: "An item in your cart is no longer available.",
  },
  insufficient_stock: {
    fr: "La quantité demandée n'est plus disponible.",
    en: "The requested quantity is no longer in stock.",
  },
  order_failed: {
    fr: "La commande n'a pas pu être finalisée.",
    en: "The order could not be completed.",
  },
};

function errorResponse(code: CheckoutErrorCode, status: number, detail?: unknown) {
  const message = MESSAGES[code];
  return NextResponse.json(
    {
      code,
      // « error » reste rempli pour les appels bruts (curl, intégrations)
      error: `${message.fr} / ${message.en}`,
      messages: message,
      ...(detail ? { detail } : {}),
    },
    { status },
  );
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const { input, errors } = parseCheckoutPayload(payload);

  if (!input) {
    return errorResponse(errors[0] ?? "invalid_payload", 400);
  }

  // Rattachement au compte : lu dans le cookie signé, jamais dans la charge
  // utile. Un visiteur sans compte, ou dont la session a expiré, passe commande
  // comme avant.
  const customer = await getCurrentCustomer();

  // Rattachement à la campagne qui a amené le visiteur, lu dans son cookie et
  // revalidé en base. C'est le seul endroit où l'attribution se décide : le
  // navigateur n'envoie qu'un jeton, jamais un montant ni un droit.
  const campaign = await resolveCampaignContext();

  try {
    const order = await createOrder(
      input,
      customer?.id,
      campaign ? { campaignId: campaign.campaignId, recipientId: campaign.recipientId } : undefined,
    );

    // Confirmation au client, notification au vendeur.
    //
    // Différé avec `after` : la commande est déjà écrite et le stock déjà
    // décompté, le client n'a aucune raison de patienter le temps d'une poignée
    // de main SMTP. Next exécute le rappel une fois la réponse envoyée, et le
    // fait même si la requête s'est mal terminée.
    //
    // `sendOrderEmails` ne lève jamais : une boîte injoignable laisse une trace
    // dans les journaux et dans l'historique de la commande, jamais une erreur
    // 500 sur une commande valable.
    after(() => sendOrderEmails(order));

    // Les stocks affichés dans la boutique ont changé.
    revalidatePath("/", "layout");

    // Encaissement en ligne quand le moyen choisi y est rattaché : le client
    // sera redirigé vers la page de paiement du prestataire. Sinon (virement,
    // prestataire non configuré), on retombe sur le parcours habituel.
    const redirectUrl = await startOnlinePayment(order);

    return NextResponse.json(
      {
        orderNumber: order.orderNumber,
        accessToken: order.accessToken,
        // Chemin à suivre après la commande ; le jeton évite qu'un numéro
        // deviné donne accès à l'adresse du client.
        confirmationPath: `/confirmation/${order.orderNumber}?token=${order.accessToken}`,
        // Présent uniquement si un paiement en ligne a été ouvert : le client
        // doit alors quitter le site vers cette URL externe.
        ...(redirectUrl ? { redirectUrl } : {}),
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalCents: order.totalCents,
        currency: order.currency,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderError) {
      const status = error.code === "order_failed" ? 500 : 409;
      return errorResponse(error.code, status, error.detail);
    }
    // Panne inattendue : la trace reste côté serveur, le client ne reçoit
    // qu'un message générique.
    console.error("[checkout] Bestellung fehlgeschlagen:", error);
    return errorResponse("order_failed", 500);
  }
}
