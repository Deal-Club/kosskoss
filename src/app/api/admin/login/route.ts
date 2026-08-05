import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/server/admins";
import { checkLoginRate, registerFailedLogin, resetLoginRate } from "@/server/loginRate";
import { issueLoginChallenge } from "@/server/adminOtp";

/**
 * Premier facteur : e-mail + mot de passe.
 * En cas de succès, aucune session n'est ouverte — un code à usage unique part
 * par e-mail et la suite se joue sur /api/admin/login/verify.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // On freine les tentatives automatisées avant même d'interroger la base.
  const rate = checkLoginRate(email);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Trop de tentatives. Réessayez dans ${rate.retryAfterSeconds} secondes.`,
      },
      { status: 429 },
    );
  }

  const user = email && password ? await authenticateAdmin(email, password) : null;

  if (!user) {
    registerFailedLogin(email);
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }

  // Le mot de passe est bon : le compteur d'échecs repart à zéro, le second
  // facteur prend le relais avec son propre compteur de tentatives.
  resetLoginRate(email);

  try {
    const challenge = await issueLoginChallenge(user);
    return NextResponse.json({ step: "otp", ...challenge });
  } catch (error) {
    // L'échec vient du fournisseur d'e-mail. On ne bascule pas en session
    // ouverte pour autant : sans code, pas de connexion.
    console.error("[admin-otp] Envoi du code impossible :", error);
    return NextResponse.json(
      { error: "Impossible d'envoyer le code de connexion. Contactez l'administrateur." },
      { status: 502 },
    );
  }
}
