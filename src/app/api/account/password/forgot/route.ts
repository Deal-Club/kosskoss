import { NextResponse } from "next/server";
import { isAccountMailDevFallback, requestPasswordReset } from "@/server/customers";
import { customerResetRate } from "@/server/customerRate";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Demande de réinitialisation du mot de passe.
 *
 * La réponse est toujours identique — statut 200 et même message — que
 * l'adresse soit enregistrée ou non. C'est la formulation recommandée par
 * l'OWASP Authentication Cheat Sheet : « If that email address is in our
 * database, we will send you an email to reset your password. »
 *
 * Le compteur de tentatives porte lui aussi sur l'adresse dans les deux cas :
 * un blocage qui n'arriverait que sur les adresses connues serait un aveu.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const locale = body?.locale === "en" ? "en" : "fr";

  const rate = customerResetRate.check(email);
  if (!rate.allowed) {
    return accountErrorResponse("rate_limited", 429, { retryAfterSeconds: rate.retryAfterSeconds });
  }
  customerResetRate.register(email);

  let devLink: string | undefined;
  try {
    const result = await requestPasswordReset(email, locale);
    devLink = result.devLink;
  } catch (error) {
    // Même en cas de panne, la réponse reste la même : un statut différent
    // révélerait que le compte existe.
    console.error("[konto] Demande de réinitialisation impossible :", error);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Falls ein Konto mit dieser E-Mail-Adresse besteht, haben wir Ihnen einen Link zum " +
      "un lien de réinitialisation du mot de passe.",
    // Repli de développement, comme pour le code du back-office : sans
    // fournisseur d'e-mail configuré, le lien est renvoyé ici et écrit dans la
    // console du serveur. Impossible en production, le garde-fou porte sur
    // NODE_ENV === "development".
    ...(isAccountMailDevFallback() && devLink ? { devLink } : {}),
  });
}
