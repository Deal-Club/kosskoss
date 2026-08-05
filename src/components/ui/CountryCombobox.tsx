"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown } from "lucide-react";
import { countryOptions, type CountryOption } from "@/lib/countries";

// Sélecteur de pays avec recherche au clavier.
//
// La liste et son tri viennent de `countryOptions(locale)` : les noms sont
// traduits par l'Intl du navigateur, donc la langue de la boutique suffit à
// changer l'affichage. Le filtrage est assuré par Base UI, qui compare avec
// Intl.Collator — « ethiopie » retrouve donc « Éthiopie », et « espagne »
// retrouve « Espagne ».

const FIELD =
  "w-full rounded-sm border border-border bg-white py-2 pr-9 pl-3 text-sm outline-none focus:border-primary";

export function CountryCombobox({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  /** Code ISO 3166-1 alpha-2 du pays retenu. */
  value: string;
  onChange: (next: string) => void;
  autoComplete?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("checkout");

  const options = useMemo(() => countryOptions(locale), [locale]);
  // `selected` est pris dans `options` : Base UI compare les valeurs avec
  // Object.is, il faut donc la référence du tableau et non une copie.
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  return (
    <Combobox.Root
      items={options}
      value={selected}
      // Un effacement renvoie null : on conserve alors le pays courant plutôt
      // que d'envoyer une adresse sans pays au serveur.
      onValueChange={(next) => {
        if (next) onChange(next.value);
      }}
    >
      <div className="relative">
        <Combobox.Input
          id={id}
          autoComplete={autoComplete}
          placeholder={t("countryPlaceholder")}
          className={FIELD}
        />
        <Combobox.Trigger
          aria-label={t("countryToggle")}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Combobox.Icon>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Combobox.Icon>
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50">
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-sm border border-border bg-white py-1 shadow-lg">
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
              {t("countryEmpty")}
            </Combobox.Empty>
            <Combobox.List>
              {(item: CountryOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-default items-center gap-2 px-3 py-1.5 text-sm data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <Combobox.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="shrink-0 text-[11px] font-bold tracking-wider text-muted-foreground">
                    {item.value}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
