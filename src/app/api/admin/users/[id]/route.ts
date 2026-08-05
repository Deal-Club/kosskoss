import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import {
  SUPERADMIN_ROLE,
  deleteAdminUser,
  isHiddenFromViewer,
  isSuperadminSession,
  listAdminUsers,
  updateAdminUser,
} from "@/server/admins";
import { prisma } from "@/server/prisma";

/** Longueur minimale des mots de passe du back-office. */
const MIN_PASSWORD_LENGTH = 10;

const ALLOWED_ROLES = ["admin", "owner"];

type Params = Promise<{ id: string }>;

/**
 * Réponse unique pour « ce compte n'existe pas » et « ce compte vous est
 * caché ». Un 403 distinguerait les deux cas et confirmerait l'existence du
 * superadmin à qui devinerait son identifiant.
 */
const notFound = () =>
  NextResponse.json({ error: "Ce compte n'existe pas." }, { status: 404 });

export async function GET(_request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (await isHiddenFromViewer(id, session)) return notFound();

  const user = (
    await listAdminUsers({ includeSuperadmins: await isSuperadminSession(session) })
  ).find((entry) => entry.id === id);
  if (!user) return notFound();

  return NextResponse.json(user);
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  // Ni modification ni changement de mot de passe sur un compte qu'on ne voit pas.
  if (await isHiddenFromViewer(id, session)) return notFound();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const patch: {
    email?: string;
    name?: string;
    password?: string;
    role?: string;
    active?: boolean;
  } = {};

  if (typeof body.email === "string") {
    const email = body.email.trim();
    // Contrôle volontairement minimal : le serveur SMTP est seul juge de la
    // validité réelle d'une adresse, on écarte juste ce qui n'en est pas une.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
    patch.email = email;
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
    }
    patch.name = name;
  }

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
        { status: 400 },
      );
    }
    patch.password = body.password;
  }

  if (typeof body.role === "string") {
    // Promouvoir un compte en superadmin reste réservé aux superadmins :
    // sinon n'importe quel admin se fabriquerait un accès invisible.
    const allowed = (await isSuperadminSession(session))
      ? [...ALLOWED_ROLES, SUPERADMIN_ROLE]
      : ALLOWED_ROLES;

    if (!allowed.includes(body.role)) {
      return NextResponse.json(
        { error: "Rôle inconnu. Les valeurs autorisées sont « admin » et « owner »." },
        { status: 400 },
      );
    }
    patch.role = body.role;
  }

  if (typeof body.active === "boolean") {
    // Sans ce garde-fou, le dernier accès pourrait se verrouiller lui-même.
    if (!body.active) {
      const activeCount = await prisma.adminUser.count({ where: { active: true } });
      const target = await prisma.adminUser.findUnique({ where: { id } });
      if (target?.active && activeCount <= 1) {
        return NextResponse.json(
          { error: "Le dernier administrateur actif ne peut pas être désactivé." },
          { status: 409 },
        );
      }
      if (session && target?.id === session.userId) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas désactiver votre propre compte." },
          { status: 409 },
        );
      }
    }
    patch.active = body.active;
  }

  try {
    const updated = await updateAdminUser(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Ce compte n'existe pas." }, { status: 404 });
    }
    // updateAdminUser ne renvoie jamais le hash du mot de passe.
    return NextResponse.json(updated);
  } catch (error) {
    // Adresse déjà prise, essentiellement.
    const message = error instanceof Error ? error.message : "Échec de la modification.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  // Un compte invisible ne peut pas être supprimé par qui ne le voit pas.
  if (await isHiddenFromViewer(id, session)) return notFound();

  if (session && session.userId === id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 409 },
    );
  }

  try {
    const deleted = await deleteAdminUser(id);
    if (!deleted) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    // src/server/admins.ts refuse la suppression du dernier compte actif.
    const message = error instanceof Error ? error.message : "Échec de la suppression.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
