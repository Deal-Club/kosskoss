"use client";

import { GOOGLE_CATEGORY_BY_SLUG } from "@/lib/googleTaxonomy";

// Bloc de champs « Google Merchant Center » à insérer dans le formulaire produit.
// Composant contrôlé : le formulaire garde ses états, ce bloc ne fait que les
// afficher et signaler les modifications via onChange.

export interface MerchantFieldsValues {
  gtin: string;
  mpn: string;
  condition: string;
  googleProductCategory: string;
  /** Poids en grammes, saisi en texte pour rester cohérent avec le reste du formulaire. */
  shippingWeightGrams: string;
  energyEfficiencyClass: string;
}

export const EMPTY_MERCHANT_FIELDS: MerchantFieldsValues = {
  gtin: "",
  mpn: "",
  condition: "new",
  googleProductCategory: "",
  shippingWeightGrams: "",
  energyEfficiencyClass: "",
};

interface MerchantFieldsFieldsetProps {
  values: MerchantFieldsValues;
  onChange: (patch: Partial<MerchantFieldsValues>) => void;
  /** Slug de la catégorie choisie : sert à proposer la bonne catégorie Google. */
  categorySlug?: string;
}

const CONDITIONS: { value: string; label: string }[] = [
  { value: "new", label: "Neuf" },
  { value: "refurbished", label: "Reconditionné" },
  { value: "used", label: "Occasion" },
];

const ENERGY_CLASSES = ["", "A", "B", "C", "D", "E", "F", "G", "A+", "A++", "A+++"];

const inputClass =
  "w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary";

export function MerchantFieldsFieldset({
  values,
  onChange,
  categorySlug,
}: MerchantFieldsFieldsetProps) {
  const suggestion = categorySlug ? GOOGLE_CATEGORY_BY_SLUG[categorySlug] : undefined;
  const gtinDigits = values.gtin.replace(/\D/g, "");
  const gtinInvalid = gtinDigits.length > 0 && ![8, 12, 13, 14].includes(gtinDigits.length);

  return (
    <fieldset className="mb-6 rounded-sm border border-border p-4">
      <legend className="px-2 text-sm font-black text-foreground">Google Merchant Center</legend>
      <p className="mb-4 text-xs text-muted-foreground">
        Ces informations sont reprises dans le flux produits et dans les données structurées. Sans
        GTIN ni MPN, Google refuse les articles neufs de marque.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">GTIN / EAN</span>
          <input
            value={values.gtin}
            onChange={(event) => onChange({ gtin: event.target.value })}
            inputMode="numeric"
            placeholder="13 chiffres du code-barres, ex. 4242003852101"
            aria-invalid={gtinInvalid}
            className={inputClass}
          />
          <span
            className={
              gtinInvalid
                ? "mt-1 block text-xs font-bold text-destructive"
                : "mt-1 block text-xs text-muted-foreground"
            }
          >
            {gtinInvalid
              ? `${gtinDigits.length} chiffres — les valeurs valides sont 8, 12, 13 ou 14.`
              : "Ne saisir que le code-barres réel. Un GTIN inventé entraîne la suspension du compte."}
          </span>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            MPN (référence fabricant)
          </span>
          <input
            value={values.mpn}
            onChange={(event) => onChange({ mpn: event.target.value })}
            placeholder="ex. WAU28RH1"
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Numéro de modèle du fabricant, pas la référence interne.
          </span>
        </label>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">État</span>
          <select
            value={values.condition}
            onChange={(event) => onChange({ condition: event.target.value })}
            className={inputClass}
          >
            {CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Poids d&apos;expédition (g)</span>
          <input
            type="number"
            min="0"
            step="10"
            value={values.shippingWeightGrams}
            onChange={(event) => onChange({ shippingWeightGrams: event.target.value })}
            placeholder="ex. 68000"
            className={inputClass}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            Classe d&apos;efficacité énergétique
          </span>
          <select
            value={values.energyEfficiencyClass}
            onChange={(event) => onChange({ energyEfficiencyClass: event.target.value })}
            className={inputClass}
          >
            {ENERGY_CLASSES.map((energyClass) => (
              <option key={energyClass || "none"} value={energyClass}>
                {energyClass || "— aucune —"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-foreground">
          Catégorie produit Google
        </span>
        <input
          value={values.googleProductCategory}
          onChange={(event) => onChange({ googleProductCategory: event.target.value })}
          placeholder="ID numérique de la taxonomie Google, ex. 680"
          className={inputClass}
        />
        {suggestion ? (
          <span className="mt-1 block text-xs text-muted-foreground">
            Suggestion pour cette catégorie :{" "}
            <button
              type="button"
              onClick={() => onChange({ googleProductCategory: suggestion.id })}
              className="font-bold text-primary underline"
            >
              {suggestion.id}
            </button>{" "}
            — {suggestion.path}
          </span>
        ) : (
          <span className="mt-1 block text-xs text-muted-foreground">
            Laisser vide pour utiliser la catégorie par défaut de l&apos;univers produits.
          </span>
        )}
      </label>
    </fieldset>
  );
}
