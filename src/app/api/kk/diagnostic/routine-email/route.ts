import { NextResponse } from "next/server";
import { computeDiagnostic } from "@/server/kk/diagnostic";
import { sendRoutineEmail } from "@/server/kk/emails";
import { choisirLangue } from "@/lib/kk/langue";
import { adresseEmailValide } from "@/lib/kk/email-valide";
import { customerRoutineEmailRate } from "@/server/customerRate";

/**
 * Envoi de la routine par e-mail.
 *
 * Même règle de validation d'adresse que la route newsletter — voir
 * `src/lib/kk/email-valide.ts`, qui explique pourquoi elle est partagée.
 *
 * Route publique, sans compte requis, qui envoie vers une adresse arbitraire :
 * sans frein, n'importe qui pourrait mailbomber un tiers sous la réputation
 * d'envoi de la boutique — la même que celle des confirmations de commande et
 * des factures. Même limiteur que « mot de passe oublié »
 * (`src/app/api/account/password/forgot/route.ts`), qui affronte le même
 * risque et la même contrainte de ne rien révéler sur l'adresse.
 */

/**
 * Borne haute sur le nombre de réponses. Le questionnaire ne compte
 * aujourd'hui que cinq questions à réponse unique : même avec de la marge
 * pour son évolution, un tableau de cette taille ne peut pas rejeter un vrai
 * visiteur. Elle protège la requête Prisma qui suit (`id: { in: answerIds }`)
 * d'un tableau démesuré.
 */
const REPONSES_MAX = 20;

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

  // Le blocage porte sur l'adresse dans tous les cas, qu'elle corresponde ou
  // non à un client ou un abonné existant : un 429 qui ne surviendrait que
  // sur les adresses connues serait un aveu.
  const rate = customerRoutineEmailRate.check(adresse);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Trop de tentatives. Merci de patienter un instant avant de réessayer.",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      { status: 429 },
    );
  }
  customerRoutineEmailRate.register(adresse);

  const reponses = Array.isArray(answers)
    ? answers.filter((x): x is string => typeof x === "string")
    : [];
  if (reponses.length === 0) {
    return NextResponse.json({ error: "Réponses manquantes." }, { status: 400 });
  }
  if (reponses.length > REPONSES_MAX) {
    return NextResponse.json({ error: "Trop de réponses." }, { status: 400 });
  }

  const langue = choisirLangue(typeof locale === "string" ? locale : undefined);

  // Recalculé côté serveur, jamais accepté depuis le navigateur : une routine
  // envoyée par le client porterait les produits et les prix de son choix,
  // dans un e-mail qui porte notre marque.
  //
  // Le résultat porte désormais DEUX routines (Essentielle et Premium) : ce
  // formulaire, hérité de l'ancien moteur à routine unique, envoie celle des
  // deux qui existe en priorité — l'Essentielle, repli sur la Premium si elle
  // seule a pu être déterminée. L'écran de résultat nomme la routine envoyée
  // dans son propre libellé (voir DiagnosticFlow), pour que ce choix reste
  // honnête plutôt que silencieux.
  const resultat = await computeDiagnostic(reponses, langue);
  const routine = resultat.essentielle ?? resultat.premium;
  if (!routine) {
    return NextResponse.json({ error: "Aucune routine à envoyer pour ces réponses." }, { status: 400 });
  }

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
