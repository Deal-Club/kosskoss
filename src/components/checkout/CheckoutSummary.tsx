"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import { formatCents } from "@/lib/cart";
import type { CartLine, CartTotals } from "@/lib/cart";

// Bloc récapitulatif du tunnel de commande.
//
// § 312j Abs. 2 BGB impose que le prix total, les frais de livraison et les
// caractéristiques essentielles des articles soient visibles « unmittelbar
// bevor der Verbraucher seine Bestellung abgibt » — donc juste au-dessus du
// bouton, sans que le client ait à ouvrir quoi que ce soit.

export function CheckoutSummary({
  lines,
  totals,
  showItems = true,
}: {
  lines: readonly CartLine[];
  totals: CartTotals;
  showItems?: boolean;
}) {
  const t = useTranslations("checkout");

  return (
    <div className="rounded-sm border border-border bg-white p-5">
      <h2 className="mb-4 text-lg font-black text-foreground">{t("summaryTitle")}</h2>

      {showItems && (
        <ul className="mb-4 space-y-3 border-b border-border pb-4">
          {lines.map((line) => (
            <li key={line.productId} className="flex items-start gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-muted">
                {line.image && (
                  <Image
                    src={line.image}
                    alt={`${line.brand} ${line.name}`}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {line.brand}
                </span>
                <span className="block truncate text-sm font-semibold text-foreground">
                  {line.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("quantityShort", { count: line.quantity })} {formatCents(line.priceCents)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-foreground">
                {formatCents(line.priceCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("subtotal")}</dt>
          <dd className="font-semibold text-foreground">{formatCents(totals.subtotalCents)}</dd>
        </div>
        {/* Le mode retenu est nommé sous le montant : « 60,00 € » sans mention
            de l'express laisserait le client deviner d'où vient la somme. */}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {t("shipping")}
            <span className="mt-0.5 block text-xs">
              {t(`shippingMethods.${totals.shippingMethodKey}.label`)} ·{" "}
              {t(`shippingMethods.${totals.shippingMethodKey}.delay`)}
            </span>
          </dt>
          <dd className="font-semibold text-foreground">
            {totals.shippingCents === 0 ? t("shippingFree") : formatCents(totals.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-base">
          <dt className="font-black text-foreground">{t("total")}</dt>
          <dd className="font-black text-primary">{formatCents(totals.totalCents)}</dd>
        </div>
      </dl>

      {/* Le détail du taux et du montant de TVA a été retiré à la demande du
          commerçant. La mention ci-dessous reste : l'article L112-1 du Code de
          la consommation impose d'indiquer au consommateur que le prix affiché
          comprend la taxe, même sans en détailler le calcul. */}
      <p className="mt-1 text-xs text-muted-foreground">{t("priceNote")}</p>

      <p className="mt-3 flex items-start gap-2 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span>{t("deliveryTime")}</span>
      </p>
    </div>
  );
}
