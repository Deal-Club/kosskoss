"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  ALERT_SUCCESS,
  HINT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";

/** Changement de mot de passe : le mot de passe actuel est exigé. */
export function PasswordChangeForm() {
  const t = useTranslations("account");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    if (password !== passwordConfirm) {
      setErrorCode("password_mismatch");
      return;
    }

    setPending(true);
    setErrorCode(null);

    const result = await sendAccountRequest("/api/account/password/change", "POST", {
      currentPassword,
      password,
      passwordConfirm,
    });

    setPending(false);

    if (!result.ok) {
      setErrorCode(result.code ?? "server_error");
      return;
    }

    // Les champs sont vidés : un mot de passe n'a pas à rester dans le DOM.
    setCurrentPassword("");
    setPassword("");
    setPasswordConfirm("");
    setSaved(true);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {errorCode && (
        <p role="alert" className={ALERT_ERROR}>
          {t(`errors.${errorCode}` as "errors.server_error")}
        </p>
      )}
      {saved && (
        <p role="status" className={ALERT_SUCCESS}>
          {t("data.passwordSaved")}
        </p>
      )}

      <div>
        <label className={LABEL} htmlFor="password-current">
          {t("data.currentPassword")}
        </label>
        <input
          id="password-current"
          type="password"
          required
          autoComplete="current-password"
          maxLength={200}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="password-new">
            {t("data.newPassword")}
          </label>
          <input
            id="password-new"
            type="password"
            required
            minLength={12}
            maxLength={200}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="password-new-hint"
            className={INPUT}
          />
          <p id="password-new-hint" className={HINT}>
            {t("register.passwordHint")}
          </p>
        </div>
        <div>
          <label className={LABEL} htmlFor="password-confirm">
            {t("data.newPasswordConfirm")}
          </label>
          <input
            id="password-confirm"
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
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className={PRIMARY_BUTTON}>
        {pending ? t("common.saving") : t("data.passwordSubmit")}
      </button>
    </form>
  );
}
