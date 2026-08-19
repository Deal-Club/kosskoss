import { NextResponse } from "next/server";
import { createKossOrder, type CheckoutItemInput, type KKPaymentMethod } from "@/server/kk/checkout";
import { demandePaiementEnLigne, ouvrirPaiement, paiementDisponible } from "@/server/kk/paiement";

/**
 * Validation de commande.
 *
 * ── LA COMMANDE EXISTE AVANT LE PAIEMENT, ET C'EST VOULU ────────────────────
 *
 * On enregistre d'abord, on encaisse ensuite. Si l'ouverture du paiement
 * échoue — passerelle en panne, clés expirées, réseau coupé — la commande
 * subsiste en « en attente de paiement » et la boutique peut la reprendre par
 * WhatsApp. L'inverse ferait perdre la vente et le client avec.
 *
 * `urlPaiement` n'est donc PAS garanti dans la réponse. Le navigateur y
 * redirige quand il est là, et retombe sur la page de confirmation sinon.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalide" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [];

  const result = await createKossOrder({
    items,
    fullName: String(body.fullName ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    location: String(body.location ?? ""),
    followOrder: Boolean(body.followOrder),
    paymentMethod: body.paymentMethod as KKPaymentMethod,
    locale: String(body.locale ?? "fr"),
    // Seul le code transite ; le montant de la remise est recalculé en base.
    couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  // Ouverture du paiement. Toute erreur est absorbée : la commande est déjà
  // enregistrée, et la perdre pour une passerelle indisponible serait absurde.
  //
  // Le paiement à la livraison en est exclu : le client a choisi de régler au
  // livreur, l'envoyer sur une page de paiement serait un contresens.
  const moyen = String(body.paymentMethod ?? "");
  let urlPaiement: string | undefined;
  if (paiementDisponible() && demandePaiementEnLigne(moyen) && result.orderNumber) {
    try {
      const origine = new URL(request.url).origin;
      const ouverture = await ouvrirPaiement(result.orderNumber, origine);
      urlPaiement = ouverture?.urlPaiement;
    } catch (error) {
      // Tracé pour le back-office, jamais renvoyé au client : un message de
      // passerelle peut porter des détails de configuration.
      console.error("[checkout] ouverture du paiement impossible", error);
    }
  }

  return NextResponse.json({ ...result, urlPaiement }, { status: 200 });
}
