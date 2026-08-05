import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isSessionSecretConfigured,
} from "@/lib/adminAuth";
import { markAdminLoggedIn } from "@/server/admins";
import { verifyLoginChallenge } from "@/server/adminOtp";

/**
 * Second facteur : le code reçu par e-mail. C'est la seule route qui pose le
 * cookie de session du back-office.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
  const code = typeof body?.code === "string" ? body.code : "";

  if (!challengeId || !code) {
    return NextResponse.json({ error: "Code manquant." }, { status: 400 });
  }

  // Contrôle posé avant la vérification, et non après : valider le code le
  // consomme définitivement. Sur un serveur où la clé de signature manque, le
  // faire dans l'autre ordre brûlerait un code valide à chaque essai, et
  // l'utilisateur croirait s'être trompé de code.
  if (!isSessionSecretConfigured()) {
    console.error("[admin-login] ADMIN_SESSION_SECRET absente : session impossible à signer.");
    return NextResponse.json(
      {
        error:
          "Le serveur n'est pas configuré pour ouvrir une session (ADMIN_SESSION_SECRET manquante). Votre code n'est pas en cause.",
      },
      { status: 500 },
    );
  }

  const result = await verifyLoginChallenge(challengeId, code);

  if (result.status === "expired") {
    return NextResponse.json(
      { error: "Code expiré ou trop de tentatives. Recommencez la connexion.", restart: true },
      { status: 401 },
    );
  }

  if (result.status === "invalid") {
    return NextResponse.json(
      {
        error: `Code incorrect. Il reste ${result.attemptsLeft} tentative${
          result.attemptsLeft > 1 ? "s" : ""
        }.`,
      },
      { status: 401 },
    );
  }

  await markAdminLoggedIn(result.user.id);

  const token = createSessionToken(result.user.email, result.user.id);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({
    success: true,
    user: { name: result.user.name, email: result.user.email },
  });
}
