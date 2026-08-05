import { NextResponse } from "next/server";
import { changeCustomerPassword } from "@/server/customers";
import { getCurrentCustomer } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Changement de mot de passe depuis l'espace client.
 * Le mot de passe actuel est exigé : un cookie volé ne doit pas suffire à
 * verrouiller le titulaire hors de son propre compte.
 */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return accountErrorResponse("invalid_payload", 400);
  }

  const raw = body as Record<string, unknown>;
  if (typeof raw.password !== "string" || raw.password !== raw.passwordConfirm) {
    return accountErrorResponse("password_mismatch", 400);
  }

  const result = await changeCustomerPassword(customer.id, raw.currentPassword, raw.password);
  if (!result.ok) {
    return accountErrorResponse(result.code, result.code === "invalid_credentials" ? 401 : 422);
  }

  return NextResponse.json({ ok: true, message: "Votre mot de passe a été modifié." });
}
