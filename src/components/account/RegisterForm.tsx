"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  ALERT_INFO,
  HINT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";

/**
 * Inscription.
 *
 * L'écran de fin est le même que l'adresse ait été libre ou déjà enregistrée :
 * la réponse du serveur ne fait pas la différence, l'interface ne peut donc pas
 * la trahir. Aucune session n'est ouverte ici, le client se connecte ensuite.
 */
export function RegisterForm() {
  const t = useTranslations("account");
  const locale = useLocale();

  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);

    const result = await sendAccountRequest("/api/account/register", "POST", {
      salutation,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      locale,
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
        <h2 className="text-lg font-black text-foreground">{t("register.doneTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("register.doneText")}</p>
        <Link href="/compte/connexion" className={`${PRIMARY_BUTTON} mt-5`}>
          {t("register.doneCta")}
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
        <label className={LABEL} htmlFor="register-salutation">
          {t("fields.salutation")}
        </label>
        <select
          id="register-salutation"
          value={salutation}
          onChange={(event) => setSalutation(event.target.value)}
          className={`${INPUT} sm:w-56`}
        >
          <option value="">{t("fields.salutationNone")}</option>
          <option value="herr">{t("fields.salutationMr")}</option>
          <option value="frau">{t("fields.salutationMrs")}</option>
          <option value="divers">{t("fields.salutationDiverse")}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="register-first-name">
            {t("fields.firstName")} <span aria-hidden>*</span>
          </label>
          <input
            id="register-first-name"
            required
            autoComplete="given-name"
            maxLength={80}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="register-last-name">
            {t("fields.lastName")} <span aria-hidden>*</span>
          </label>
          <input
            id="register-last-name"
            required
            autoComplete="family-name"
            maxLength={80}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="register-email">
          {t("fields.email")} <span aria-hidden>*</span>
        </label>
        <input
          id="register-email"
          type="email"
          required
          autoComplete="email"
          maxLength={160}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="register-phone">
          {t("fields.phone")}{" "}
          <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
        </label>
        <input
          id="register-phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-describedby="register-phone-hint"
          className={INPUT}
        />
        <p id="register-phone-hint" className={HINT}>
          {t("fields.phoneHint")}
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="register-password">
          {t("fields.password")} <span aria-hidden>*</span>
        </label>
        <input
          id="register-password"
          type="password"
          required
          minLength={12}
          maxLength={200}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="register-password-hint"
          className={INPUT}
        />
        <p id="register-password-hint" className={HINT}>
          {t("register.passwordHint")}
        </p>
      </div>

      <p className={ALERT_INFO}>
        {t.rich("register.privacyNote", {
          privacy: (chunks) => (
            <Link href="/confidentialite" className="font-semibold text-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <button type="submit" disabled={pending} aria-busy={pending} className={`${PRIMARY_BUTTON} w-full`}>
        {pending ? t("register.submitting") : t("register.submit")}
      </button>

      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        {t("register.haveAccount")}{" "}
        <Link href="/compte/connexion" className="font-semibold text-primary hover:underline">
          {t("register.loginLink")}
        </Link>
      </p>
    </form>
  );
}
