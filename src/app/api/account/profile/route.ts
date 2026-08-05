import { NextResponse } from "next/server";
import { parseProfilePayload, updateCustomerProfile } from "@/server/customers";
import { getCurrentCustomer } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Mise à jour des données personnelles — droit de rectification (art. 16 RGPD).
 *
 * L'adresse e-mail n'est volontairement pas modifiable ici : la changer sans
 * vérification permettrait de détourner un compte vers une boîte contrôlée par
 * un tiers. Elle demandera un double opt-in (voir docs/ACCOUNTS.md).
 */
export async function PATCH(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const payload = await request.json().catch(() => null);
  const parsed = parseProfilePayload(payload);
  if (!parsed.ok) return accountErrorResponse(parsed.code, 400);

  const updated = await updateCustomerProfile(customer.id, parsed.value);
  if (!updated) return accountErrorResponse("not_found", 404);

  return NextResponse.json({
    ok: true,
    message: "Ihre Daten wurden gespeichert.",
    customer: {
      salutation: updated.salutation,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
    },
  });
}
