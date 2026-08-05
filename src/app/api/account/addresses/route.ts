import { NextResponse } from "next/server";
import { parseAddressPayload, updateCustomerAddresses } from "@/server/customers";
import { getCurrentCustomer } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Adresses de facturation et de livraison enregistrées dans le compte.
 *
 * Elles ne servent qu'à pré-remplir le tunnel de commande : la commande
 * archive sa propre copie des adresses (§ 312f BGB), modifier le compte ne
 * touche donc jamais une commande déjà passée.
 * Une adresse entièrement vide est acceptée : le client peut retirer ce qu'il
 * ne veut plus voir stocké.
 */
export async function PUT(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const payload = await request.json().catch(() => null);
  const parsed = parseAddressPayload(payload);
  if (!parsed.ok) return accountErrorResponse(parsed.code, 400);

  const updated = await updateCustomerAddresses(customer.id, parsed.value);
  if (!updated) return accountErrorResponse("not_found", 404);

  return NextResponse.json({
    ok: true,
    message: "Ihre Adressen wurden gespeichert.",
    billing: updated.billing,
    shippingSameAsBilling: updated.shippingSameAsBilling,
    shipping: updated.shipping,
  });
}
