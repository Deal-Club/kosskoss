import { NextResponse } from "next/server";
import { buildRoutine } from "@/server/kk/diagnostic";
import { sendRoutineEmail } from "@/server/kk/emails";
import { choisirLangue } from "@/lib/kk/langue";
import { adresseEmailValide } from "@/lib/kk/email-valide";

/**
 * Envoi de la routine par e-mail.
 *
 * Même règle de validation d'adresse que la route newsletter — voir
 * `src/lib/kk/email-valide.ts`, qui explique pourquoi elle est partagée.
 */

export async function POST(request: Request) {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  const { email, answers, locale } = (corps ?? {}) as Record<string, unknown>;

  const adresse = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!adresseEmailValide(adresse)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  const reponses = Array.isArray(answers)
    ? answers.filter((x): x is string => typeof x === "string")
    : [];
  if (reponses.length === 0) {
    return NextResponse.json({ error: "Réponses manquantes." }, { status: 400 });
  }

  const langue = choisirLangue(typeof locale === "string" ? locale : undefined);

  // Recalculée côté serveur, jamais acceptée depuis le navigateur : une
  // routine envoyée par le client porterait les produits et les prix de son
  // choix, dans un e-mail qui porte notre marque.
  const routine = await buildRoutine(reponses, langue);

  const etapes = routine.steps.map((s) => ({
    label: s.label,
    brand: s.product.brand,
    name: s.product.name,
    prixFcfa: s.product.priceFcfa,
  }));

  // Best-effort : une panne SMTP ne doit pas remonter au visiteur, qui a déjà
  // son résultat sous les yeux.
  await sendRoutineEmail({ to: adresse, langue, etapes, totalFcfa: routine.totalFcfa });

  // Réponse identique dans tous les cas d'adresse valide : elle ne doit
  // jamais permettre de savoir si une adresse est déjà connue quelque part.
  return NextResponse.json({ ok: true });
}
