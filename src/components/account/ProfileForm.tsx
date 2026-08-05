"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  ALERT_INFO,
  ALERT_SUCCESS,
  HINT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";

export interface ProfileValues {
  salutation: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

/** Rectification des données personnelles (art. 16 RGPD). */
export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const t = useTranslations("account");
  const router = useRouter();

  const [salutation, setSalutation] = useState(initial.salutation);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);
    setSaved(false);

    const result = await sendAccountRequest("/api/account/profile", "PATCH", {
      salutation,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });

    setPending(false);

    if (!result.ok) {
      setErrorCode(result.code ?? "server_error");
      return;
    }

    setSaved(true);
    // Le nom apparaît dans la salutation du tableau de bord : on rafraîchit.
    router.refresh();
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
          {t("data.profileSaved")}
        </p>
      )}

      <div>
        <label className={LABEL} htmlFor="profile-salutation">
          {t("fields.salutation")}
        </label>
        <select
          id="profile-salutation"
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
          <label className={LABEL} htmlFor="profile-first-name">
            {t("fields.firstName")} <span aria-hidden>*</span>
          </label>
          <input
            id="profile-first-name"
            required
            autoComplete="given-name"
            maxLength={80}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="profile-last-name">
            {t("fields.lastName")} <span aria-hidden>*</span>
          </label>
          <input
            id="profile-last-name"
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
        <label className={LABEL} htmlFor="profile-phone">
          {t("fields.phone")}{" "}
          <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
        </label>
        <input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-describedby="profile-phone-hint"
          className={INPUT}
        />
        <p id="profile-phone-hint" className={HINT}>
          {t("fields.phoneHint")}
        </p>
      </div>

      {/* L'adresse e-mail sert d'identifiant de connexion : elle n'est pas
          modifiable sans vérification de la nouvelle boîte. */}
      <div>
        <label className={LABEL} htmlFor="profile-email">
          {t("fields.email")}
        </label>
        <input
          id="profile-email"
          type="email"
          readOnly
          value={initial.email}
          aria-describedby="profile-email-hint"
          className={`${INPUT} bg-muted text-muted-foreground`}
        />
        <p id="profile-email-hint" className={`${ALERT_INFO} mt-2`}>
          {t("data.emailFixed")}
        </p>
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className={PRIMARY_BUTTON}>
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}
