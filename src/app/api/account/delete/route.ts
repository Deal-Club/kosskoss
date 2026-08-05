import { NextResponse } from "next/server";
import { deleteCustomerAccount } from "@/server/customers";
import { closeCustomerSession, getCurrentCustomer } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Droit à l'effacement (art. 17 RGPD).
 *
 * Deux garde-fous avant d'agir : le mot de passe est redemandé, et le client
 * doit recopier le mot « SUPPRIMER ». La suppression est irréversible.
 *
 * Ce qui est supprimé : le compte, le mot de passe haché, les adresses
 * enregistrées, les demandes de réinitialisation en cours.
 * Ce qui subsiste : les commandes, détachées du compte et anonymisées. Elles
 * relèvent d'une obligation légale de conservation (§ 147 AO, § 257 HGB), cas
 * réservé par l'art. 17 § 3 b RGPD. Le client en est informé sur la page, avant
 * de confirmer, et le nombre de commandes concernées lui est rappelé ici.
 */
const CONFIRMATION_WORD = "SUPPRIMER";

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return accountErrorResponse("invalid_payload", 400);
  }

  const raw = body as Record<string, unknown>;
  const confirmation = typeof raw.confirm === "string" ? raw.confirm.trim().toUpperCase() : "";
  if (confirmation !== CONFIRMATION_WORD) {
    return accountErrorResponse("confirmation_required", 400);
  }

  const result = await deleteCustomerAccount(customer.id, raw.password);
  if (!result.ok) {
    return accountErrorResponse(result.code, result.code === "invalid_credentials" ? 401 : 404);
  }

  await closeCustomerSession();

  return NextResponse.json({
    ok: true,
    anonymizedOrders: result.value.anonymizedOrders,
    message:
      "Votre compte client a été supprimé. Les commandes déjà exécutées restent conservées " +
      "au titre des obligations comptables et fiscales, mais ne sont plus rattachées à vous.",
  });
}
