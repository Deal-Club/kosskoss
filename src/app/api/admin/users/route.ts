import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import {
  SUPERADMIN_ROLE,
  createAdminUser,
  isSuperadminSession,
  listAdminUsers,
} from "@/server/admins";

/** Longueur minimale des mots de passe du back-office. */
const MIN_PASSWORD_LENGTH = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ALLOWED_ROLES = ["admin", "owner"];

export async function GET() {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  // listAdminUsers liefert bewusst kein Passwortfeld — auch keinen Hash.
  // Les superadmins ne sortent d'ici que pour un autre superadmin.
  const users = await listAdminUsers({
    includeSuperadmins: await isSuperadminSession(session),
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = typeof body?.role === "string" ? body.role.trim() : "admin";

  if (!name) {
    return NextResponse.json({ error: "Veuillez indiquer un nom." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Veuillez indiquer une adresse e-mail valide." },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
      { status: 400 },
    );
  }
  // Seul un superadmin peut en créer un autre. Pour tous les autres comptes le
  // rôle n'existe même pas : le message d'erreur est le même que pour une
  // valeur inventée, il ne révèle donc rien.
  const allowed = (await isSuperadminSession(session))
    ? [...ALLOWED_ROLES, SUPERADMIN_ROLE]
    : ALLOWED_ROLES;

  if (!allowed.includes(role)) {
    return NextResponse.json(
      { error: "Rôle inconnu. Les valeurs autorisées sont « admin » et « owner »." },
      { status: 400 },
    );
  }

  try {
    const user = await createAdminUser({ email, name, password, role });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la création.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
