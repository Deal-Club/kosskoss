import { NextResponse } from "next/server";
import { authenticateCustomer, markCustomerLoggedIn } from "@/server/customers";
import { customerLoginRate } from "@/server/customerRate";
import { openCustomerSession } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Connexion d'un client.
 *
 * Un seul message d'échec, quel que soit le motif : adresse inconnue, mot de
 * passe faux ou compte désactivé renvoient tous « E-Mail-Adresse oder Passwort
 * ist falsch. » avec le même statut 401. `authenticateCustomer` vérifie en plus
 * un haché factice quand l'adresse n'existe pas, pour que la durée de la
 * réponse ne trahisse rien non plus.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const rate = customerLoginRate.check(email);
  if (!rate.allowed) {
    return accountErrorResponse("rate_limited", 429, { retryAfterSeconds: rate.retryAfterSeconds });
  }

  if (!email || !password) {
    customerLoginRate.register(email);
    return accountErrorResponse("invalid_credentials", 401);
  }

  const customer = await authenticateCustomer(email, password);

  if (!customer) {
    customerLoginRate.register(email);
    return accountErrorResponse("invalid_credentials", 401);
  }

  customerLoginRate.reset(email);
  await markCustomerLoggedIn(customer.id);
  await openCustomerSession(customer);

  return NextResponse.json({
    ok: true,
    customer: { firstName: customer.firstName, lastName: customer.lastName, email: customer.email },
  });
}
