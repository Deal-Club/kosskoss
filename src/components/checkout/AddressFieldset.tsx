"use client";

import { useTranslations } from "next-intl";
import { CountryCombobox } from "@/components/ui/CountryCombobox";
import { DEFAULT_COUNTRY } from "@/lib/countries";

export interface AddressValue {
  salutation: string;
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  salutation: "",
  firstName: "",
  lastName: "",
  company: "",
  street: "",
  postalCode: "",
  city: "",
  country: DEFAULT_COUNTRY,
};

const INPUT =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";

const LABEL = "mb-1 block text-sm font-semibold text-foreground";

export function AddressFieldset({
  idPrefix,
  value,
  onChange,
}: {
  /** Préfixe des identifiants : deux adresses coexistent sur la même page. */
  idPrefix: string;
  value: AddressValue;
  onChange: (next: AddressValue) => void;
}) {
  const t = useTranslations("checkout");
  const isFrance = value.country === "FR";

  function update<K extends keyof AddressValue>(key: K, next: AddressValue[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor={`${idPrefix}-salutation`}>
          {t("salutation")}
        </label>
        <select
          id={`${idPrefix}-salutation`}
          value={value.salutation}
          onChange={(event) => update("salutation", event.target.value)}
          className={`${INPUT} sm:w-56`}
        >
          <option value="">{t("salutationNone")}</option>
          <option value="herr">{t("salutationMr")}</option>
          <option value="frau">{t("salutationMrs")}</option>
          <option value="divers">{t("salutationDiverse")}</option>
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor={`${idPrefix}-firstName`}>
          {t("firstName")} <span aria-hidden>*</span>
        </label>
        <input
          id={`${idPrefix}-firstName`}
          required
          autoComplete={idPrefix === "billing" ? "billing given-name" : "shipping given-name"}
          maxLength={80}
          value={value.firstName}
          onChange={(event) => update("firstName", event.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${idPrefix}-lastName`}>
          {t("lastName")} <span aria-hidden>*</span>
        </label>
        <input
          id={`${idPrefix}-lastName`}
          required
          autoComplete={idPrefix === "billing" ? "billing family-name" : "shipping family-name"}
          maxLength={80}
          value={value.lastName}
          onChange={(event) => update("lastName", event.target.value)}
          className={INPUT}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor={`${idPrefix}-company`}>
          {t("company")}
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
          {t("street")} <span aria-hidden>*</span>
        </label>
        <input
          id={`${idPrefix}-street`}
          required
          autoComplete={idPrefix === "billing" ? "billing street-address" : "shipping street-address"}
          maxLength={160}
          value={value.street}
          onChange={(event) => update("street", event.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${idPrefix}-postalCode`}>
          {t("postalCode")} <span aria-hidden>*</span>
        </label>
        {/* Le format du code postal dépend du pays : la France tient en cinq
            chiffres, mais « SW1A 1AA » ou « 1000 » sont tout aussi valides
            ailleurs. On ne contraint donc la saisie que pour la France. */}
        <input
          id={`${idPrefix}-postalCode`}
          required
          inputMode={isFrance ? "numeric" : "text"}
          pattern={isFrance ? "\\d{5}" : undefined}
          autoComplete={idPrefix === "billing" ? "billing postal-code" : "shipping postal-code"}
          maxLength={isFrance ? 5 : 12}
          value={value.postalCode}
          onChange={(event) =>
            update(
              "postalCode",
              isFrance
                ? event.target.value.replace(/\D/g, "")
                : event.target.value.replace(/[^A-Za-z0-9\s-]/g, ""),
            )
          }
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${idPrefix}-city`}>
          {t("city")} <span aria-hidden>*</span>
        </label>
        <input
          id={`${idPrefix}-city`}
          required
          autoComplete={idPrefix === "billing" ? "billing address-level2" : "shipping address-level2"}
          maxLength={80}
          value={value.city}
          onChange={(event) => update("city", event.target.value)}
          className={INPUT}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor={`${idPrefix}-country`}>
          {t("country")} <span aria-hidden>*</span>
        </label>
        <CountryCombobox
          id={`${idPrefix}-country`}
          value={value.country}
          onChange={(next) => update("country", next)}
          autoComplete={idPrefix === "billing" ? "billing country" : "shipping country"}
        />
      </div>
    </div>
  );
}
