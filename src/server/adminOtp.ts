/**
 * Second facteur du back-office : code à six chiffres envoyé par e-mail.
 *
 * Déroulé : mot de passe valide -> création d'un « challenge » en base ->
 * envoi du code -> saisie du code -> ouverture de la session.
 * Le cookie de session n'est posé qu'à la toute fin : un mot de passe volé ne
 * suffit plus à entrer.
 *
 * Décisions de sécurité :
 * - le code est haché (scrypt, comme les mots de passe), jamais stocké en clair ;
 * - l'identifiant du challenge est un jeton aléatoire de 32 octets, pas un cuid :
 *   il transite par le navigateur et ne doit pas être devinable ;
 * - cinq tentatives par challenge, puis il est brûlé ;
 * - un renvoi produit un nouveau code et invalide l'ancien.
 */

import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/server/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { buildAdminOtpEmail } from "@/server/emails/adminOtp";
import { getActiveAdminUser, type AdminUserRecord } from "@/server/admins";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Vrai uniquement en développement sans fournisseur d'e-mail configuré. */
export function isOtpDevFallback(): boolean {
  return process.env.NODE_ENV === "development" && !isMailConfigured();
}

function generateCode(): string {
  // randomInt plutôt que Math.random : générateur cryptographique.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function generateChallengeId(): string {
  return randomBytes(32).toString("base64url");
}

/** Masque l'adresse pour l'affichage : « ad•••@exemple.fr ». */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

/** Supprime les challenges périmés ou consommés. Appelé à chaque création. */
async function purgeStaleChallenges(): Promise<void> {
  await prisma.adminLoginChallenge.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }],
    },
  });
}

export interface IssuedChallenge {
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  /** Renseigné seulement en développement sans fournisseur d'e-mail. */
  devCode?: string;
}

async function deliverCode(user: AdminUserRecord, code: string): Promise<string | undefined> {
  const email = buildAdminOtpEmail({
    code,
    name: user.name,
    expiresInMinutes: OTP_TTL_MINUTES,
  });

  if (isOtpDevFallback()) {
    // Sans clé d'API en local, le code passe par la console du serveur pour ne
    // pas bloquer le développement. Impossible en production : le garde-fou
    // porte sur NODE_ENV === "development".
    console.info(`[admin-otp] Code pour ${user.email} : ${code} (aucun e-mail configuré)`);
    return code;
  }

  await sendMail({ to: user.email, ...email });
  return undefined;
}

/** Vrai pour une violation d'unicité renvoyée par Prisma (code P2002). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Crée un challenge, envoie le code, invalide le précédent du même compte.
 *
 * La réservation est atomique, et c'est tout l'enjeu : deux requêtes qui
 * arrivent en même temps — un double-clic sur « Continuer » suffit — lisaient
 * autrefois l'état avant que l'une ait écrit, ne se voyaient donc pas, et
 * expédiaient deux codes. Ici c'est la base qui arbitre :
 *   - `create` échoue en P2002 si une ligne existe déjà (index unique sur
 *     adminUserId) ;
 *   - `updateMany` ne renouvelle le code que si le délai d'attente est écoulé,
 *     et son nombre de lignes modifiées désigne le gagnant.
 * Dans les deux cas, une seule requête repart avec le droit d'envoyer.
 */
export async function issueLoginChallenge(user: AdminUserRecord): Promise<IssuedChallenge> {
  await purgeStaleChallenges();

  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
  const code = generateCode();
  const codeHash = hashPassword(code);

  let maySend: boolean;

  try {
    await prisma.adminLoginChallenge.create({
      data: {
        id: generateChallengeId(),
        adminUserId: user.id,
        email: user.email,
        codeHash,
        expiresAt,
        sentAt: now,
      },
    });
    maySend = true;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // Une ligne existe déjà. On ne la renouvelle que si le dernier code est
    // hors délai, périmé ou consommé — sinon on rend le challenge en cours
    // sans rien renvoyer. Le renvoi volontaire passe par la route dédiée.
    const { count } = await prisma.adminLoginChallenge.updateMany({
      where: {
        adminUserId: user.id,
        OR: [
          { sentAt: { lte: cooldownCutoff } },
          { expiresAt: { lte: now } },
          { consumedAt: { not: null } },
        ],
      },
      data: { codeHash, attempts: 0, expiresAt, sentAt: now, consumedAt: null },
    });
    maySend = count === 1;
  }

  const challenge = await prisma.adminLoginChallenge.findUnique({
    where: { adminUserId: user.id },
  });
  if (!challenge) {
    // La ligne vient d'être écrite : son absence signale une base incohérente.
    throw new Error("Le défi de connexion n'a pas pu être enregistré.");
  }

  const devCode = maySend ? await deliverCode(user, code) : undefined;

  return {
    challengeId: challenge.id,
    maskedEmail: maskEmail(user.email),
    expiresInSeconds: Math.max(
      Math.ceil((challenge.expiresAt.getTime() - Date.now()) / 1000),
      0,
    ),
    devCode,
  };
}

export type ResendResult =
  | { status: "sent"; challenge: IssuedChallenge }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "expired" };

/**
 * Renvoie un nouveau code sur le même challenge, avec délai d'attente.
 *
 * Le délai est appliqué dans le `where` de la mise à jour, pas par un test
 * préalable : deux clics simultanés sur « Renvoyer le code » sinon passaient
 * tous deux la vérification et expédiaient deux codes. Ici la base ne laisse
 * qu'une seule requête modifier la ligne.
 */
export async function resendLoginChallenge(challengeId: string): Promise<ResendResult> {
  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000);

  const existing = await prisma.adminLoginChallenge.findUnique({ where: { id: challengeId } });
  if (!existing || existing.consumedAt || existing.expiresAt < now) {
    return { status: "expired" };
  }

  const user = await getActiveAdminUser(existing.adminUserId);
  if (!user) return { status: "expired" };

  const code = generateCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  // Le compteur de tentatives repart de zéro : l'ancien code n'est plus valable.
  const { count } = await prisma.adminLoginChallenge.updateMany({
    where: {
      id: challengeId,
      consumedAt: null,
      expiresAt: { gt: now },
      sentAt: { lte: cooldownCutoff },
    },
    data: { codeHash: hashPassword(code), attempts: 0, expiresAt, sentAt: now },
  });

  if (count === 0) {
    // Personne n'a modifié la ligne : soit le délai n'est pas écoulé, soit une
    // requête concurrente vient de renvoyer le code. On relit pour le dire.
    const current = await prisma.adminLoginChallenge.findUnique({ where: { id: challengeId } });
    if (!current || current.consumedAt || current.expiresAt < new Date()) {
      return { status: "expired" };
    }
    const remaining = current.sentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
    return { status: "cooldown", retryAfterSeconds: Math.max(Math.ceil(remaining / 1000), 1) };
  }

  const devCode = await deliverCode(user, code);

  return {
    status: "sent",
    challenge: {
      challengeId,
      maskedEmail: maskEmail(user.email),
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      devCode,
    },
  };
}

export type VerifyResult =
  | { status: "ok"; user: AdminUserRecord }
  | { status: "invalid"; attemptsLeft: number }
  | { status: "expired" };

/** Valide le code saisi et consomme le challenge en cas de succès. */
export async function verifyLoginChallenge(
  challengeId: string,
  code: string,
): Promise<VerifyResult> {
  const submitted = code.replace(/\D/g, "");
  const challenge = await prisma.adminLoginChallenge.findUnique({ where: { id: challengeId } });

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt < new Date() ||
    challenge.attempts >= OTP_MAX_ATTEMPTS
  ) {
    return { status: "expired" };
  }

  if (submitted.length !== 6 || !verifyPassword(submitted, challenge.codeHash)) {
    const updated = await prisma.adminLoginChallenge.update({
      where: { id: challengeId },
      data: { attempts: { increment: 1 } },
    });
    const attemptsLeft = Math.max(OTP_MAX_ATTEMPTS - updated.attempts, 0);
    // Plus aucune tentative : le challenge est mort, on le supprime.
    if (attemptsLeft === 0) {
      await prisma.adminLoginChallenge.delete({ where: { id: challengeId } });
      return { status: "expired" };
    }
    return { status: "invalid", attemptsLeft };
  }

  const user = await getActiveAdminUser(challenge.adminUserId);
  if (!user) return { status: "expired" };

  // Consommé puis supprimé : un code validé ne peut pas resservir.
  await prisma.adminLoginChallenge.delete({ where: { id: challengeId } });

  return { status: "ok", user };
}
