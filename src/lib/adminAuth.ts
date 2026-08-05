import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return secret;
}

/**
 * Vrai si la signature des sessions est configurable. À vérifier **avant** de
 * consommer le code à usage unique : sans ce garde-fou, un serveur mal
 * configuré valide le code, le supprime, puis échoue à ouvrir la session —
 * l'utilisateur perd un code parfaitement valide à chaque tentative.
 */
export function isSessionSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_SESSION_SECRET);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface AdminSession {
  email: string;
  userId?: string;
}

// Les identifiants sont vérifiés contre la base dans src/server/admins.ts.
// Ce module ne s'occupe que du jeton de session signé.
export function createSessionToken(email: string, userId?: string): string {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ email, userId, expiresAt })).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      email: string;
      userId?: string;
      expiresAt: number;
    };
    if (Date.now() > data.expiresAt) return null;
    return { email: data.email, userId: data.userId };
  } catch {
    return null;
  }
}
