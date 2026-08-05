import { NextResponse } from "next/server";
import { resendLoginChallenge } from "@/server/adminOtp";

/** Renvoie un nouveau code sur un challenge en cours, avec délai d'attente. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";

  if (!challengeId) {
    return NextResponse.json({ error: "Session de connexion introuvable." }, { status: 400 });
  }

  try {
    const result = await resendLoginChallenge(challengeId);

    if (result.status === "expired") {
      return NextResponse.json(
        { error: "Session de connexion expirée. Recommencez.", restart: true },
        { status: 401 },
      );
    }

    if (result.status === "cooldown") {
      return NextResponse.json(
        { error: `Nouveau code possible dans ${result.retryAfterSeconds} secondes.` },
        { status: 429 },
      );
    }

    return NextResponse.json({ step: "otp", ...result.challenge });
  } catch (error) {
    console.error("[admin-otp] Renvoi du code impossible :", error);
    return NextResponse.json(
      { error: "Impossible d'envoyer le code de connexion. Contactez l'administrateur." },
      { status: 502 },
    );
  }
}
