"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  ALERT_SUCCESS,
  HINT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";

/**
 * Formulaire de connexion.
 *
 * Le message d'échec est unique et vient toujours du même code
 * (« invalid_credentials ») : la page ne dit jamais si l'adresse existe.
 */
export function LoginForm({
  returnPath,
  notice,
}: {
  /** Chemin interne vers lequel revenir après la connexion. */
  returnPath?: string;
  /** Bandeau affiché après une inscription ou un changement de mot de passe. */
  notice?: "registered" | "passwordChanged";
}) {
  const t = useTranslations("account");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);

    const result = await sendAccountRequest("/api/account/login", "POST", {
      email: email.trim(),
      password,
    });

    if (!result.ok) {
      setPending(false);
      setErrorCode(result.code ?? "server_error");
      return;
    }

    // La session vient d'être posée côté serveur : il faut refaire le rendu
    // pour que l'en-tête et les pages protégées la voient.
    router.replace(returnPath ?? "/compte");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {notice && (
        <p role="status" className={ALERT_SUCCESS}>
          {notice === "registered" ? t("login.registered") : t("login.passwordChanged")}
        </p>
      )}

      {errorCode && (
        <p role="alert" className={ALERT_ERROR}>
          {t(`errors.${errorCode}` as "errors.server_error")}
        </p>
      )}

      <div>
        <label className={LABEL} htmlFor="login-email">
          {t("fields.email")}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          maxLength={160}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="login-password">
          {t("fields.password")}
        </label>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          maxLength={200}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={INPUT}
        />
        <p className={HINT}>
          <Link
            href="/compte/mot-de-passe-oublie"
            className="font-semibold text-primary hover:underline"
          >
            {t("login.forgot")}
          </Link>
        </p>
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className={`${PRIMARY_BUTTON} w-full`}>
        {pending ? t("login.submitting") : t("login.submit")}
      </button>

      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link href="/compte/inscription" className="font-semibold text-primary hover:underline">
          {t("login.registerLink")}
        </Link>
      </p>
    </form>
  );
}
