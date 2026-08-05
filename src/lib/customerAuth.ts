import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session des clients de la boutique.
 *
 * Volontairement séparée du back-office : cookie différent, secret différent,
 * module différent. Une session client signée avec CUSTOMER_SESSION_SECRET ne
 * peut donc jamais être présentée comme une session d'administration, et
 * inversement — même en cas de fuite d'un des deux secrets.
 */

export const CUSTOMER_SESSION_COOKIE = "customer_session";

/**
 * Quatorze jours. Assez long pour ne pas reconnecter le client à chaque visite,
 * assez court pour limiter la fenêtre d'usage d'un cookie volé (art. 32 RGPD).
 */
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function getSecret(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) {
    throw new Error("CUSTOMER_SESSION_SECRET is not set");
  }
  return secret;
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

export interface CustomerSession {
  customerId: string;
  email: string;
}

/**
 * Jeton signé HMAC-SHA256 : « charge utile base64url . signature hexadécimale ».
 * La charge utile n'est pas chiffrée — elle ne contient que l'identifiant et
 * l'adresse, jamais le mot de passe, même haché.
 */
export function createCustomerSessionToken(customerId: string, email: string): string {
  const expiresAt = Date.now() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ customerId, email, expiresAt })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyCustomerSessionToken(
  token: string | undefined | null,
): CustomerSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      customerId?: unknown;
      email?: unknown;
      expiresAt?: unknown;
    };
    if (typeof data.customerId !== "string" || typeof data.email !== "string") return null;
    if (typeof data.expiresAt !== "number" || Date.now() > data.expiresAt) return null;
    return { customerId: data.customerId, email: data.email };
  } catch {
    return null;
  }
}
