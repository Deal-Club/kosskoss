"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, Trash2, UserCheck, UserX } from "lucide-react";
import { IconActionButton } from "@/components/admin/IconAction";
import type { AdminUserRecord } from "@/server/admins";

/** Doit correspondre à la vérification dans /api/admin/users. */
const MIN_PASSWORD_LENGTH = 10;

/**
 * Création d'un nouvel accès.
 *
 * `allowSuperadmin` n'est vrai que pour un superadmin connecté : pour tous les
 * autres, le rôle n'apparaît pas dans la liste déroulante. Le filtre n'est
 * qu'un confort d'affichage — l'API refuse de toute façon le rôle à qui n'y a
 * pas droit.
 */
export function UserForm({ allowSuperadmin = false }: { allowSuperadmin?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    setPending(true);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setPending(false);

    if (response.ok) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      setSuccess("L'accès a été créé.");
      router.refresh();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Échec de la création.");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-sm border border-border bg-white p-5">
      <h2 className="mb-4 text-sm font-black tracking-wide text-foreground uppercase">
        Créer un nouvel accès
      </h2>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">E-mail</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Mot de passe</span>
          <input
            required
            type="password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {MIN_PASSWORD_LENGTH} caractères minimum.
          </span>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Rôle</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          >
            <option value="admin">Administrateur</option>
            <option value="owner">Propriétaire</option>
            {allowSuperadmin ? <option value="superadmin">Superadmin (invisible)</option> : null}
          </select>
          {allowSuperadmin ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              Un superadmin n&apos;apparaît dans aucune liste et ses actions sont journalisées
              sous « System ».
            </span>
          ) : null}
        </label>
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-destructive">{error}</p> : null}
      {success ? <p className="mb-4 text-sm font-semibold text-foreground">{success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer l'accès"}
      </button>
    </form>
  );
}

interface UserRowActionsProps {
  user: AdminUserRecord;
  /** Son propre accès ne peut être ni désactivé ni supprimé. */
  isSelf: boolean;
}

/**
 * Changer l'adresse ou le mot de passe, activer/désactiver et supprimer — pour
 * chaque ligne du tableau.
 */
export function UserRowActions({ user, isSelf }: UserRowActionsProps) {
  const router = useRouter();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function send(method: "PUT" | "DELETE", body?: Record<string, unknown>) {
    setMessage(null);
    setPending(true);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setPending(false);

    if (response.ok) {
      router.refresh();
      return true;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setMessage({ tone: "error", text: data?.error ?? "Échec de l'action." });
    return false;
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage({
        tone: "error",
        text: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      });
      return;
    }

    const ok = await send("PUT", { password });
    if (ok) {
      setPassword("");
      setPasswordOpen(false);
      setMessage({ tone: "success", text: "Mot de passe modifié." });
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim();
    if (next.toLowerCase() === user.email.toLowerCase()) {
      setEmailOpen(false);
      return;
    }

    // L'adresse porte le code de connexion à six chiffres : une faute de frappe
    // ferme l'accès au back-office, d'où la confirmation explicite.
    const confirmed = window.confirm(
      `Le code de connexion sera désormais envoyé à « ${next} ». ` +
        `C'est aussi l'identifiant de connexion. Continuer ?`,
    );
    if (!confirmed) return;

    const ok = await send("PUT", { email: next });
    if (ok) {
      setEmailOpen(false);
      setMessage({ tone: "success", text: "Adresse modifiée." });
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement l'accès « ${user.email} » ?`)) return;
    await send("DELETE");
  }

  return (
    <div className="text-right">
      <div className="flex flex-wrap items-center justify-end gap-1">
        <IconActionButton
          label="Modifier l'adresse e-mail"
          icon={AtSign}
          onClick={() => {
            setMessage(null);
            setEmail(user.email);
            setPasswordOpen(false);
            setEmailOpen((open) => !open);
          }}
        />
        <IconActionButton
          label="Changer le mot de passe"
          icon={KeyRound}
          onClick={() => {
            setMessage(null);
            setEmailOpen(false);
            setPasswordOpen((open) => !open);
          }}
        />
        <IconActionButton
          label={user.active ? "Désactiver" : "Activer"}
          icon={user.active ? UserX : UserCheck}
          tone={user.active ? "neutral" : "success"}
          onClick={() => send("PUT", { active: !user.active })}
          disabled={pending || (isSelf && user.active)}
        />
        <IconActionButton
          label="Supprimer"
          icon={Trash2}
          tone="danger"
          onClick={handleDelete}
          disabled={pending || isSelf}
        />
      </div>

      {emailOpen ? (
        <form onSubmit={handleEmailSubmit} className="mt-2 flex items-center justify-end gap-2">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Nouvelle adresse e-mail"
            className="w-72 rounded-sm border border-border px-3 py-1.5 text-sm font-normal outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            Enregistrer
          </button>
        </form>
      ) : null}

      {passwordOpen ? (
        <form onSubmit={handlePasswordSubmit} className="mt-2 flex items-center justify-end gap-2">
          <input
            type="password"
            value={password}
            minLength={MIN_PASSWORD_LENGTH}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`Nouveau mot de passe (min. ${MIN_PASSWORD_LENGTH})`}
            className="w-56 rounded-sm border border-border px-3 py-1.5 text-sm font-normal outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            Définir
          </button>
        </form>
      ) : null}

      {message ? (
        <p
          className={
            message.tone === "error"
              ? "mt-1 text-xs font-normal text-destructive"
              : "mt-1 text-xs font-normal text-muted-foreground"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
