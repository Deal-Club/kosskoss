import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/server/customers";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Pose un nouveau mot de passe à partir du lien reçu par e-mail.
 *
 * Le jeton n'est jamais stocké en clair : la base ne contient que son SHA-256.
 * Il est à usage unique et toutes les demandes du même compte tombent avec lui.
 * Aucune session n'est ouverte : le client se reconnecte, ce qui vérifie que le
 * nouveau mot de passe est bien celui qu'il croit avoir choisi.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return accountErrorResponse("invalid_payload", 400);
  }

  const raw = body as Record<string, unknown>;
  const password = raw.password;
  const passwordConfirm = raw.passwordConfirm;

  if (typeof password !== "string" || password !== passwordConfirm) {
    return accountErrorResponse("password_mismatch", 400);
  }

  const result = await resetPasswordWithToken(raw.token, password);
  if (!result.ok) {
    return accountErrorResponse(result.code, result.code === "invalid_token" ? 400 : 422);
  }

  return NextResponse.json({
    ok: true,
    message: "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.",
  });
}
