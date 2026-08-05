import { NextResponse } from "next/server";
import { createReview, productExists } from "@/server/reviews";

// Anti-spam volontairement minimaliste : au plus trois avis par produit et par
// fenêtre de dix minutes. Le compteur vit en mémoire du processus, comme
// src/server/loginRate.ts — suffisant pour un serveur unique, à déplacer vers
// Redis le jour où plusieurs instances tournent en parallèle.
const MAX_REVIEWS_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60 * 1000;

interface SubmissionWindow {
  count: number;
  firstSubmissionAt: number;
}

const submissions = new Map<string, SubmissionWindow>();

function checkReviewRate(productId: string): { allowed: boolean; retryAfterSeconds: number } {
  const entry = submissions.get(productId);
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  const elapsed = Date.now() - entry.firstSubmissionAt;
  if (elapsed > WINDOW_MS) {
    submissions.delete(productId);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count < MAX_REVIEWS_PER_WINDOW) return { allowed: true, retryAfterSeconds: 0 };

  return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - elapsed) / 1000) };
}

function registerSubmission(productId: string): void {
  const entry = submissions.get(productId);

  if (!entry || Date.now() - entry.firstSubmissionAt > WINDOW_MS) {
    submissions.set(productId, { count: 1, firstSubmissionAt: Date.now() });
    return;
  }

  entry.count += 1;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const productId = readString(payload.productId);
  const authorName = readString(payload.authorName);
  const authorEmail = readString(payload.authorEmail);
  const city = readString(payload.city);
  const title = readString(payload.title);
  const body = readString(payload.body);
  const rating = typeof payload.rating === "number" ? payload.rating : Number.NaN;

  if (!productId) {
    return NextResponse.json({ error: "Das Produkt konnte nicht zugeordnet werden." }, { status: 400 });
  }

  if (authorName.length < 2 || authorName.length > 80) {
    return NextResponse.json(
      { error: "Bitte geben Sie einen Namen mit 2 bis 80 Zeichen an." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Merci de choisir une note de 1 à 5 étoiles." },
      { status: 400 },
    );
  }

  if (body.length < 10 || body.length > 2000) {
    return NextResponse.json(
      { error: "Ihr Bewertungstext muss zwischen 10 und 2000 Zeichen lang sein." },
      { status: 400 },
    );
  }

  if (title.length > 120) {
    return NextResponse.json(
      { error: "Le titre ne peut pas dépasser 120 caractères." },
      { status: 400 },
    );
  }

  if (city.length > 80) {
    return NextResponse.json(
      { error: "La ville ne peut pas dépasser 80 caractères." },
      { status: 400 },
    );
  }

  if (authorEmail && !EMAIL_PATTERN.test(authorEmail)) {
    return NextResponse.json(
      { error: "Merci d'indiquer une adresse e-mail valide." },
      { status: 400 },
    );
  }

  if (!(await productExists(productId))) {
    return NextResponse.json({ error: "Das Produkt wurde nicht gefunden." }, { status: 404 });
  }

  const rate = checkReviewRate(productId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          "Trop d'avis ont été déposés sur ce produit en peu de temps. Merci de réessayer plus tard.",
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  await createReview({
    productId,
    authorName,
    authorEmail: authorEmail || undefined,
    city: city || undefined,
    rating,
    title: title || undefined,
    body,
  });
  registerSubmission(productId);

  // L'enregistrement n'est volontairement pas renvoyé : il n'est pas publié et
  // contient l'adresse e-mail de l'auteur.
  return NextResponse.json(
    {
      success: true,
      status: "pending",
      message: "Merci ! Votre avis sera publié après vérification.",
    },
    { status: 201 },
  );
}
