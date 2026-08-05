"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

interface Challenge {
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  /** Présent uniquement en développement, quand aucun e-mail n'est configuré. */
  devCode?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

/** Formate un nombre de secondes en « 9:05 ». */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Les deux compteurs ne démarrent qu'après une action de l'utilisateur : rien
  // ne dépend de l'horloge au premier rendu, donc rien à désynchroniser entre
  // le serveur et le navigateur.
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => {
      setExpiresIn((value) => Math.max(value - 1, 0));
      setResendIn((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  useEffect(() => {
    if (challenge) codeInputRef.current?.focus();
  }, [challenge]);

  const startChallenge = useCallback((next: Challenge) => {
    setChallenge(next);
    setExpiresIn(next.expiresInSeconds);
    setResendIn(RESEND_COOLDOWN_SECONDS);
  }, []);

  function resetToCredentials(message?: string) {
    setChallenge(null);
    setCode("");
    setPassword("");
    setExpiresIn(0);
    setResendIn(0);
    setError(message ?? null);
    setNotice(null);
  }

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => null);
    setPending(false);

    if (!response.ok) {
      setError(data?.error ?? "Échec de la connexion.");
      return;
    }

    startChallenge(data as Challenge);
  }

  async function handleCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;

    setPending(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, code }),
    });

    if (response.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }

    const data = await response.json().catch(() => null);
    setPending(false);
    setCode("");

    if (data?.restart) {
      resetToCredentials(data?.error ?? "Session de connexion expirée. Recommencez.");
      return;
    }

    // Une panne du serveur ne doit pas se déguiser en « code incorrect » : le
    // code peut être parfaitement valide et l'échec venir d'ailleurs (variable
    // d'environnement manquante, base injoignable). Faire porter le doute sur
    // le code envoie chercher le problème là où il n'est pas.
    if (response.status >= 500) {
      setError(
        "Erreur du serveur. Votre code n'est pas en cause — vérifiez la configuration du site.",
      );
      return;
    }

    setError(data?.error ?? "Code incorrect.");
    codeInputRef.current?.focus();
  }

  async function handleResend() {
    if (!challenge || resendIn > 0 || pending) return;

    setPending(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/login/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId }),
    });
    const data = await response.json().catch(() => null);
    setPending(false);

    if (!response.ok) {
      if (data?.restart) {
        resetToCredentials(data?.error ?? "Session de connexion expirée. Recommencez.");
        return;
      }
      setError(data?.error ?? "Impossible de renvoyer le code.");
      return;
    }

    startChallenge(data as Challenge);
    setNotice("Nouveau code envoyé.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-sm border border-border bg-white shadow-sm">
          {/* Logo centré sur fond blanc : le lettrage est presque noir, il faut
              un fond clair. Le filet reprend l'accent de l'e-mail de code. */}
          <div className="flex justify-center bg-white px-6 pt-8 pb-6">
            <Logo tone="dark" className="scale-110" />
          </div>
          <div className="h-1 bg-primary" />

          <div className="p-6">
            {challenge ? (
              <form onSubmit={handleCode} noValidate>
                <h1 className="mb-1 text-lg font-black text-foreground">Code de vérification</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Code envoyé à <span className="font-semibold text-foreground">{challenge.maskedEmail}</span>.
                </p>

                {challenge.devCode && (
                  <p className="mb-4 rounded-sm border border-accent bg-accent/20 px-3 py-2 text-sm text-accent-foreground">
                    Développement, aucun e-mail configuré. Code :{" "}
                    <span className="font-bold">{challenge.devCode}</span>
                  </p>
                )}

                <label className="mb-2 block text-sm">
                  <span className="mb-1 block font-semibold text-foreground">Code à six chiffres</span>
                  {/* L'interlettrage ajoute un blanc après le dernier chiffre :
                      le retrait compense pour que la saisie reste optiquement centrée. */}
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-sm border border-border px-3 py-2.5 text-center text-2xl font-bold tracking-[0.4em] indent-[0.4em] text-foreground outline-none focus:border-primary"
                  />
                </label>

                <p className="mb-4 text-xs text-muted-foreground">
                  {expiresIn > 0
                    ? `Valable encore ${formatCountdown(expiresIn)}`
                    : "Code expiré, demandez-en un nouveau."}
                </p>

                {error && (
                  <p role="alert" className="mb-4 text-sm font-semibold text-destructive">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="mb-4 text-sm font-semibold text-foreground">
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending || code.length !== 6}
                  className="w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
                >
                  {pending ? "Vérification…" : "Vérifier le code"}
                </button>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => resetToCredentials()}
                    className="font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendIn > 0 || pending}
                    className="font-semibold text-primary underline underline-offset-2 disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendIn > 0 ? `Renvoyer dans ${resendIn} s` : "Renvoyer le code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCredentials}>
                <h1 className="mb-1 text-lg font-black text-foreground">Connexion administrateur</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Un code de vérification vous sera envoyé par e-mail.
                </p>

                <label className="mb-3 block text-sm">
                  <span className="mb-1 block font-semibold text-foreground">E-mail</span>
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label className="mb-4 block text-sm">
                  <span className="mb-1 block font-semibold text-foreground">Mot de passe</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                {error && (
                  <p role="alert" className="mb-4 text-sm font-semibold text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
                >
                  {pending ? "Envoi du code…" : "Continuer"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          MLC Bois — administration
        </p>
      </div>
    </div>
  );
}
