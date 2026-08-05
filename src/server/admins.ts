import { prisma } from "@/server/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { AdminSession } from "@/lib/adminAuth";

/**
 * Rôle d'accès total, volontairement absent de tous les écrans du back-office.
 *
 * Un compte porteur de ce rôle n'apparaît ni dans la liste des accès, ni dans
 * les compteurs, ni dans les journaux : ses actions y sont attribuées à
 * SYSTEM_ACTOR. Seul un autre superadmin le voit et peut le modifier.
 *
 * Le rôle vaut donc « propriétaire », plus l'invisibilité : partout où le code
 * demande une autorisation, un superadmin passe comme un owner.
 */
export const SUPERADMIN_ROLE = "superadmin";

/**
 * Étiquette portée par les lignes d'historique créées par un superadmin
 * (mouvements de stock, événements de commande, modération d'avis…).
 * Les opérations restent tracées — l'exigence comptable est préservée — mais
 * elles ne désignent aucun compte nommé.
 */
export const SYSTEM_ACTOR = "System";

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

function toRecord(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    lastLoginAt: row.lastLoginAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Liste des accès. Les superadmins en sont retirés par défaut : le filtre est
 * posé ici, dans la couche qui lit la base, pour qu'aucun appelant ne puisse
 * les faire apparaître en oubliant une option.
 */
export async function listAdminUsers(
  options: { includeSuperadmins?: boolean } = {},
): Promise<AdminUserRecord[]> {
  const rows = await prisma.adminUser.findMany({
    where: options.includeSuperadmins ? undefined : { role: { not: SUPERADMIN_ROLE } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

/** Rôle réel du compte connecté, lu en base — la session ne le transporte pas. */
export async function getSessionRole(session: AdminSession | null): Promise<string | null> {
  if (!session) return null;

  // userId n'est présent que sur les sessions émises depuis la refonte du
  // login ; l'e-mail reste le repli pour les cookies encore en circulation.
  const row = session.userId
    ? await prisma.adminUser.findUnique({ where: { id: session.userId } })
    : await prisma.adminUser.findUnique({ where: { email: session.email.toLowerCase() } });

  return row?.role ?? null;
}

/** Vrai si le compte connecté est un superadmin. */
export async function isSuperadminSession(session: AdminSession | null): Promise<boolean> {
  return (await getSessionRole(session)) === SUPERADMIN_ROLE;
}

/**
 * Nom à inscrire dans les journaux pour l'action en cours. Un superadmin y
 * figure sous SYSTEM_ACTOR, les autres sous leur adresse e-mail.
 */
export async function adminActorLabel(session: AdminSession): Promise<string>;
export async function adminActorLabel(session: AdminSession | null): Promise<string | undefined>;
export async function adminActorLabel(session: AdminSession | null): Promise<string | undefined> {
  if (!session) return undefined;
  return (await isSuperadminSession(session)) ? SYSTEM_ACTOR : session.email;
}

/** Vrai si ce compte doit rester invisible pour le spectateur donné. */
export async function isHiddenFromViewer(
  targetId: string,
  session: AdminSession | null,
): Promise<boolean> {
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (target?.role !== SUPERADMIN_ROLE) return false;
  return !(await isSuperadminSession(session));
}

export async function createAdminUser(input: {
  email: string;
  name: string;
  password: string;
  role?: string;
}): Promise<AdminUserRecord> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Cette adresse e-mail est déjà utilisée.");
  }

  const row = await prisma.adminUser.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: input.role ?? "admin",
    },
  });
  return toRecord(row);
}

export async function updateAdminUser(
  id: string,
  patch: { email?: string; name?: string; password?: string; role?: string; active?: boolean },
): Promise<AdminUserRecord | undefined> {
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) return undefined;

  // L'adresse est l'identifiant de connexion ET la boîte qui reçoit le code à
  // six chiffres : elle doit rester unique, et rester une boîte relevable.
  let email: string | undefined;
  if (patch.email !== undefined) {
    email = patch.email.trim().toLowerCase();
    if (!email) {
      throw new Error("L'adresse e-mail ne peut pas être vide.");
    }
    if (email !== existing.email) {
      const taken = await prisma.adminUser.findUnique({ where: { email } });
      if (taken) {
        throw new Error("Cette adresse e-mail est déjà utilisée.");
      }
    }
  }

  const row = await prisma.adminUser.update({
    where: { id },
    data: {
      email,
      name: patch.name?.trim(),
      role: patch.role,
      active: patch.active,
      passwordHash: patch.password ? hashPassword(patch.password) : undefined,
    },
  });
  return toRecord(row);
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) return false;

  // Le garde-fou ne porte que sur le dernier compte actif : supprimer un
  // compte déjà désactivé ne ferme la porte à personne.
  if (existing.active) {
    const remainingActive = await prisma.adminUser.count({ where: { active: true } });
    if (remainingActive <= 1) {
      throw new Error("Le dernier administrateur actif ne peut pas être supprimé.");
    }
  }

  await prisma.adminUser.delete({ where: { id } });
  return true;
}

/**
 * Vérifie les identifiants contre la base. Se rabat sur les variables
 * d'environnement tant qu'aucun compte n'existe (premier démarrage sans seed).
 *
 * Ne marque pas la connexion : le mot de passe n'est que le premier facteur,
 * « lastLoginAt » est renseigné par markAdminLoggedIn() une fois le code
 * à usage unique validé.
 */
export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email: normalized } });

  if (user) {
    if (!user.active || !verifyPassword(password, user.passwordHash)) return null;
    return toRecord(user);
  }

  const total = await prisma.adminUser.count();
  if (total > 0) return null;

  const envEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!envEmail || !envPassword || normalized !== envEmail || password !== envPassword) {
    return null;
  }

  // Première connexion : on crée le compte à partir des variables
  // d'environnement, pour que le hachage en base fasse foi ensuite.
  const created = await prisma.adminUser.create({
    data: {
      email: envEmail,
      name: "Administrator",
      passwordHash: hashPassword(envPassword),
      role: "owner",
    },
  });
  return toRecord(created);
}

/** Compte encore actif, relu par son identifiant (contrôle après le second facteur). */
export async function getActiveAdminUser(id: string): Promise<AdminUserRecord | null> {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user || !user.active) return null;
  return toRecord(user);
}

/** Horodate la connexion, une fois les deux facteurs validés. */
export async function markAdminLoggedIn(id: string): Promise<void> {
  await prisma.adminUser.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
