"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  ALERT_INFO,
  ALERT_SUCCESS,
  CARD,
  HINT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";
import { DEFAULT_COUNTRY } from "@/lib/countries";

export interface AddressValues {
  salutation: string;
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export const EMPTY_ADDRESS_VALUES: AddressValues = {
  salutation: "",
  firstName: "",
  lastName: "",
  company: "",
  street: "",
  postalCode: "",
  city: "",
  country: DEFAULT_COUNTRY,
};

/**
 * Adresses enregistrées dans le compte.
 *
 * L'adresse de facturation reprend le nom des données personnelles : le
 * dupliquer ici créerait deux vérités pour la même information. L'adresse de
 * livraison, elle, porte son propre nom — on livre souvent chez quelqu'un
 * d'autre.
 */
export function AddressForm({
  initialBilling,
  initialSameAsBilling,
  initialShipping,
  ownerName,
}: {
  initialBilling: AddressValues;
  initialSameAsBilling: boolean;
  initialShipping: AddressValues;
  /** Nom du titulaire, affiché en tête de l'adresse de facturation. */
  ownerName: string;
}) {
  const t = useTranslations("account");
  const router = useRouter();

  const [billing, setBilling] = useState(initialBilling);
  const [sameAsBilling, setSameAsBilling] = useState(initialSameAsBilling);
  const [shipping, setShipping] = useState(initialShipping);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);
    setSaved(false);

    const result = await sendAccountRequest("/api/account/addresses", "PUT", {
      billing,
      shippingSameAsBilling: sameAsBilling,
      shipping: sameAsBilling ? EMPTY_ADDRESS_VALUES : shipping,
    });

    setPending(false);

    if (!result.ok) {
      setErrorCode(result.code ?? "server_error");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {errorCode && (
        <p role="alert" className={ALERT_ERROR}>
          {t(`errors.${errorCode}` as "errors.server_error")}
        </p>
      )}
      {saved && (
        <p role="status" className={ALERT_SUCCESS}>
          {t("addresses.saved")}
        </p>
      )}

      <section className={CARD}>
        <h2 className="mb-1 text-lg font-black text-foreground">{t("addresses.billingTitle")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {ownerName} — {t("addresses.nameHint")}
        </p>
        <AddressFields idPrefix="billing" value={billing} onChange={setBilling} withName={false} />
      </section>

      <section className={CARD}>
        <label className="flex items-start gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(event) => setSameAsBilling(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          {t("addresses.sameAsBilling")}
        </label>

        {!sameAsBilling && (
          <div className="mt-5 border-t border-border pt-5">
            <h2 className="mb-4 text-lg font-black text-foreground">
              {t("addresses.shippingTitle")}
            </h2>
            <AddressFields
              idPrefix="shipping"
              value={shipping}
              onChange={setShipping}
              withName
            />
          </div>
        )}
      </section>

      <p className={ALERT_INFO}>{t("addresses.emptyHint")}</p>

      <button type="submit" disabled={pending} aria-busy={pending} className={PRIMARY_BUTTON}>
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}

function AddressFields({
  idPrefix,
  value,
  onChange,
  withName,
}: {
  idPrefix: string;
  value: AddressValues;
  onChange: (next: AddressValues) => void;
  /** L'adresse de livraison porte son propre destinataire, pas la facturation. */
  withName: boolean;
}) {
  const t = useTranslations("account");

  function update<K extends keyof AddressValues>(key: K, next: AddressValues[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {withName && (
        <>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor={`${idPrefix}-salutation`}>
              {t("fields.salutation")}
            </label>
            <select
              id={`${idPrefix}-salutation`}
              value={value.salutation}
              onChange={(event) => update("salutation", event.target.value)}
              className={`${INPUT} sm:w-56`}
            >
              <option value="">{t("fields.salutationNone")}</option>
              <option value="herr">{t("fields.salutationMr")}</option>
              <option value="frau">{t("fields.salutationMrs")}</option>
              <option value="divers">{t("fields.salutationDiverse")}</option>
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor={`${idPrefix}-first-name`}>
              {t("fields.firstName")}
            </label>
            <input
              id={`${idPrefix}-first-name`}
              autoComplete="shipping given-name"
              maxLength={80}
              value={value.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor={`${idPrefix}-last-name`}>
              {t("fields.lastName")}
            </label>
            <input
              id={`${idPrefix}-last-name`}
              autoComplete="shipping family-name"
              maxLength={80}
              value={value.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              className={INPUT}
            />
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor={`${idPrefix}-company`}>
          {t("fields.company")}{" "}
          <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
        </label>
        <input
          id={`${idPrefix}-company`}
          autoComplete="organization"
          maxLength={120}
          value={value.company}
          onChange={(event) => update("company", event.target.value)}
          className={INPUT}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor={`${idPrefix}-street`}>
          {t("fields.street")}
        </label>
        <input
          id={`${idPrefix}-street`}
          autoComplete={idPrefix === "billing" ? "billing street-address" : "shipping street-address"}
          maxLength={160}
          value={value.street}
          onChange={(event) => update("street", event.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${idPrefix}-postal-code`}>
          {t("fields.postalCode")}
        </label>
        <input
          id={`${idPrefix}-postal-code`}
          inputMode="numeric"
          pattern="\d{5}"
          autoComplete={idPrefix === "billing" ? "billing postal-code" : "shipping postal-code"}
          maxLength={5}
          value={value.postalCode}
          onChange={(event) => update("postalCode", event.target.value.replace(/\D/g, ""))}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${idPrefix}-city`}>
          {t("fields.city")}
        </label>
        <input
          id={`${idPrefix}-city`}
          autoComplete={idPrefix === "billing" ? "billing address-level2" : "shipping address-level2"}
          maxLength={80}
          value={value.city}
          onChange={(event) => update("city", event.target.value)}
          className={INPUT}
        />
      </div>

      {/* Un seul pays desservi : le champ reste visible pour information. */}
      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor={`${idPrefix}-country`}>
          {t("fields.country")}
        </label>
        <input
          id={`${idPrefix}-country`}
          readOnly
          value={t("fields.countryFR")}
          aria-describedby={`${idPrefix}-country-hint`}
          className={`${INPUT} bg-muted text-muted-foreground`}
        />
        <p id={`${idPrefix}-country-hint`} className={HINT}>
          {t("fields.countryHint")}
        </p>
      </div>
    </div>
  );
}
