"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import { ALERT_ERROR, ALERT_INFO, INPUT, LABEL, PRIMARY_BUTTON } from "@/components/account/formStyles";

/**
 * Demande de réinitialisation.
 *
 * L'écran de confirmation est le même dans tous les cas — c'est la formulation
 * recommandée par l'OWASP : « si un compte existe pour cette adresse, nous vous
 * avons envoyé un lien ». Rien ne permet de savoir si l'envoi a réellement eu
 * lieu.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("account");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);

    const result = await sendAccountRequest("/api/account/password/forgot", "POST", {
      email: email.trim(),
      locale,
    });

    setPending(false);

    if (!result.ok) {
      setErrorCode(result.code ?? "server_error");
      return;
    }

    // Renvoyé uniquement en développement, quand aucun fournisseur d'e-mail
    // n'est configuré : le lien s'affiche alors à l'écran pour ne pas bloquer
    // les essais en local.
    if (typeof result.data.devLink === "string") setDevLink(result.data.devLink);
    setDone(true);
  }

  if (done) {
    return (
      <div role="status">
        <div className="text-center">
          <MailCheck className="mx-auto mb-3 h-10 w-10 text-[#16a34a]" aria-hidden />
          <h2 className="text-lg font-black text-foreground">{t("forgot.doneTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("forgot.doneText")}</p>
        </div>

        {devLink && (
          <p className={`${ALERT_INFO} mt-4 break-all`}>
            {t("forgot.devLink")}{" "}
            <a href={devLink} className="font-semibold text-primary hover:underline">
              {devLink}
            </a>
          </p>
        )}

        <p className="mt-5 text-center">
          <Link href="/compte/connexion" className="text-sm font-semibold text-primary hover:underline">
            {t("forgot.backToLogin")}
          </Link>
        </p>
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
        <label className={LABEL} htmlFor="forgot-email">
          {t("fields.email")}
        </label>
        <input
          id="forgot-email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          maxLength={160}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={INPUT}
        />
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className={`${PRIMARY_BUTTON} w-full`}>
        {pending ? t("forgot.submitting") : t("forgot.submit")}
      </button>

      <p className="border-t border-border pt-4 text-center">
        <Link href="/compte/connexion" className="text-sm font-semibold text-primary hover:underline">
          {t("forgot.backToLogin")}
        </Link>
      </p>
    </form>
  );
}
