import { NextResponse } from "next/server";
import { parseSignUpPayload, registerCustomer } from "@/server/customers";
import { customerSignupRate } from "@/server/customerRate";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Inscription.
 *
 * La réponse est rigoureusement la même que l'adresse soit libre ou déjà
 * enregistrée : même code HTTP, même corps. C'est la seule façon d'empêcher
 * qu'un tiers dresse la liste des adresses connues de la boutique
 * (OWASP WSTG-IDNT-04). L'information passe par un canal que seul le titulaire
 * contrôle : sa boîte aux lettres reçoit soit la confirmation d'inscription,
 * soit un message « un compte existe déjà ».
 *
 * Conséquence assumée : aucune session n'est ouverte ici. Le client se connecte
 * ensuite avec le mot de passe qu'il vient de choisir. Une connexion
 * automatique rendrait à nouveau les deux cas distinguables.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = parseSignUpPayload(payload);

  if (!parsed.ok) {
    return accountErrorResponse(parsed.code, 400);
  }

  // Le compteur porte sur l'adresse et s'applique dans les deux cas : sans
  // cela, un blocage subit trahirait l'existence du compte.
  const rate = customerSignupRate.check(parsed.value.email);
  if (!rate.allowed) {
    return accountErrorResponse("rate_limited", 429, { retryAfterSeconds: rate.retryAfterSeconds });
  }
  customerSignupRate.register(parsed.value.email);

  try {
    await registerCustomer(parsed.value);
  } catch (error) {
    // Le détail reste côté serveur : il pourrait révéler l'état de la base.
    console.error("[konto] Inscription impossible :", error);
    return accountErrorResponse("server_error", 500);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Wenn die Adresse noch nicht vergeben war, ist Ihr Konto jetzt angelegt. " +
      "Wir haben Ihnen eine E-Mail geschickt. Bitte melden Sie sich mit Ihrem Passwort an.",
  });
}
