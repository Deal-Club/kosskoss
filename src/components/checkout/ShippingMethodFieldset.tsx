"use client";

import { Truck, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCents, SHIPPING_METHODS } from "@/lib/cart";
import type { ShippingMethodKey } from "@/lib/cart";

// Choix du mode de livraison, posé dans la première étape du tunnel : le client
// voit le total définitif avant même d'arriver sur le paiement, comme l'exige
// § 312j Abs. 2 BGB — les frais de livraison ne doivent pas apparaître au dernier
// moment.
//
// Le tarif et le délai viennent de SHIPPING_METHODS (src/lib/cart.ts), jamais
// d'un texte de traduction : une promesse affichée qui ne correspondrait pas au
// montant facturé serait une information trompeuse.

const ICONS: Record<ShippingMethodKey, typeof Truck> = {
  standard: Truck,
  express: Zap,
};

export function ShippingMethodFieldset({
  value,
  onChange,
}: {
  value: ShippingMethodKey;
  onChange: (key: ShippingMethodKey) => void;
}) {
  const t = useTranslations("checkout");

  return (
    <ul className="space-y-2">
      {SHIPPING_METHODS.map((method) => {
        const Icon = ICONS[method.key];
        const active = method.key === value;
        const price = method.cents === 0 ? t("shippingFree") : formatCents(method.cents);

        return (
          <li key={method.key}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={method.key}
                checked={active}
                onChange={() => onChange(method.key)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  {t(`shippingMethods.${method.key}.label`)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(`shippingMethods.${method.key}.delay`)}
                </span>
              </span>
              <span
                className={`shrink-0 text-sm font-bold ${
                  method.cents === 0 ? "text-[#16a34a]" : "text-foreground"
                }`}
              >
                {price}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
