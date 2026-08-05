"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  HINT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";

/**
 * Choix d'un nouveau mot de passe depuis le lien reçu par e-mail.
 * Le jeton reste dans l'URL et n'est envoyé qu'à la soumission ; aucune session
 * n'est ouverte, le client se reconnecte ensuite.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("account");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== passwordConfirm) {
      setErrorCode("password_mismatch");
      return;
    }

    setPending(true);
    setErrorCode(null);

    const result = await sendAccountRequest("/api/account/password/reset", "POST", {
      token,
      password,
      passwordConfirm,
    });

    setPending(false);

    if (!result.ok) {
      setErrorCode(result.code ?? "server_error");
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#16a34a]" aria-hidden />
        <h2 className="text-lg font-black text-foreground">{t("reset.doneTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("reset.doneText")}</p>
        <Link href={{ pathname: "/compte/connexion", query: { hinweis: "passwort" } }} className={`${PRIMARY_BUTTON} mt-5`}>
          {t("reset.toLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {errorCode && (
        <p role="alert" className={ALERT_ERROR}>
          {t(`errors.${errorCode}` as "errors.server_error")}
        </p>
      )}

      <div>
        <label className={LABEL} htmlFor="reset-password">
          {t("reset.newPassword")}
        </label>
        <input
          id="reset-password"
          type="password"
          required
          autoFocus
          minLength={12}
          maxLength={200}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="reset-password-hint"
          className={INPUT}
        />
        <p id="reset-password-hint" className={HINT}>
          {t("register.passwordHint")}
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="reset-password-confirm">
          {t("reset.newPasswordConfirm")}
        </label>
        <input
          id="reset-password-confirm"
          type="password"
          required
          minLength={12}
          maxLength={200}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          className={INPUT}
        />
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className={`${PRIMARY_BUTTON} w-full`}>
        {pending ? t("reset.submitting") : t("reset.submit")}
      </button>
    </form>
  );
}
