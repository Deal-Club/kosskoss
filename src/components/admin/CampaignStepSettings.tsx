"use client";

import { AlertTriangle } from "lucide-react";
import { formatCents } from "@/lib/cart";
import {
  MAX_DISCOUNT_PERCENT,
  campaignTypeDefinition,
  discountedPriceCents,
  effectivePercent,
  savingCents,
  type DiscountKind,
} from "@/lib/campaigns";
import {
  DURATION_PRESETS,
  addHours,
  parseInputValue,
  toInputValue,
  type CampaignDraft,
} from "@/components/admin/campaignDraft";
import type { CampaignProductOption } from "@/server/campaignAdmin";

const inputClass =
  "rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const KIND_LABELS: Record<DiscountKind, string> = {
  percent: "Remise en pourcentage",
  amount: "Remise en euros",
  free_shipping: "Livraison offerte",
  none: "Aucune remise",
};

interface CampaignStepSettingsProps {
  draft: CampaignDraft;
  products: CampaignProductOption[];
  onChange: (values: Partial<CampaignDraft>) => void;
}

/**
 * Étape 3 : l'avantage accordé et sa période.
 *
 * Le tableau d'aperçu appelle `discountedPriceCents()` et `savingCents()`, les
 * mêmes fonctions que le moteur de promotions et que le gabarit d'e-mail. C'est
 * la seule façon de garantir que le prix montré ici est exactement celui qui
 * sera facturé : un calcul recopié finirait par diverger d'une décimale, et
 * c'est le client qui la découvrirait.
 */
export function CampaignStepSettings({
  draft,
  products,
  onChange,
}: CampaignStepSettingsProps) {
  const definition = draft.type ? campaignTypeDefinition(draft.type) : null;
  const selected = products.filter((product) => draft.productIds.includes(product.id));

  const kinds: DiscountKind[] = ["percent", "amount"];
  if (definition?.allowsFreeShipping) kinds.push("free_shipping");
  if (!definition?.discountRequired) kinds.push("none");

  const start = parseInputValue(draft.startsAt);
  const suggestedHours = definition?.suggestedHours ?? 168;

  function applyPreset(hours: number) {
    const from = parseInputValue(draft.startsAt) ?? new Date();
    onChange({ startsAt: toInputValue(from), endsAt: toInputValue(addHours(from, hours)) });
  }

  const conflicts = selected.filter((product) => product.conflict !== null);
  const showsPrices = draft.discountKind === "percent" || draft.discountKind === "amount";

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-sm border border-border bg-white p-6">
        <h2 className="mb-1 text-lg font-black text-foreground">Avantage accordé</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {definition?.discountRequired
            ? "Ce type de campagne annonce un avantage : il est obligatoire."
            : "Ce type de campagne peut se passer de remise — l'annonce du produit suffit."}
        </p>

        <fieldset className="mb-4">
          <legend className="sr-only">Nature de l&apos;avantage</legend>
          <div className="flex flex-wrap gap-2">
            {kinds.map((kind) => (
              <label
                key={kind}
                className={`cursor-pointer rounded-sm border px-3 py-2 text-sm font-semibold ${
                  draft.discountKind === kind
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="discountKind"
                  value={kind}
                  checked={draft.discountKind === kind}
                  onChange={() =>
                    onChange({
                      discountKind: kind,
                      // Une valeur n'a de sens que pour un pourcentage ou un
                      // montant, et un « 20 » saisi en pourcentage vaudrait
                      // vingt centimes en euros : on repart de zéro.
                      discountValue: kind === "percent" ? 20 : 0,
                    })
                  }
                  className="mr-2"
                />
                {KIND_LABELS[kind]}
              </label>
            ))}
          </div>
        </fieldset>

        {draft.discountKind === "percent" && (
          <label className="block max-w-xs text-sm">
            <span className="mb-1 block font-semibold text-foreground">Remise (%)</span>
            <input
              type="number"
              min={1}
              max={MAX_DISCOUNT_PERCENT}
              step={1}
              value={draft.discountValue || ""}
              onChange={(event) =>
                onChange({ discountValue: Number.parseInt(event.target.value, 10) || 0 })
              }
              className={`${inputClass} w-full`}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              De 1 à {MAX_DISCOUNT_PERCENT} %. Une remise de 100 % offrirait le produit.
            </span>
          </label>
        )}

        {draft.discountKind === "amount" && (
          <label className="block max-w-xs text-sm">
            <span className="mb-1 block font-semibold text-foreground">Remise (€)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.discountValue ? draft.discountValue / 100 : ""}
              onChange={(event) => {
                const euros = Number.parseFloat(event.target.value);
                onChange({
                  discountValue: Number.isFinite(euros) ? Math.round(euros * 100) : 0,
                });
              }}
              className={`${inputClass} w-full`}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Le montant est retiré de chaque produit de la campagne. Il doit rester inférieur au
              plus petit prix de la sélection.
            </span>
          </label>
        )}

        {draft.discountKind === "free_shipping" && (
          <p className="max-w-xl text-sm text-muted-foreground">
            Le prix des articles ne change pas. Les frais de port sont offerts au client qui
            commande en passant par le lien du message.
          </p>
        )}

        {draft.discountKind === "none" && (
          <p className="max-w-xl text-sm text-muted-foreground">
            Aucun prix n&apos;est modifié : le message annonce le produit à son tarif habituel.
          </p>
        )}
      </div>

      <div className="rounded-sm border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-black text-foreground">Période</h2>

        <div className="mb-4 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Début</span>
            <input
              type="datetime-local"
              value={draft.startsAt}
              onChange={(event) => onChange({ startsAt: event.target.value })}
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Fin</span>
            <input
              type="datetime-local"
              value={draft.endsAt}
              onChange={(event) => onChange({ endsAt: event.target.value })}
              className={`${inputClass} w-full`}
            />
          </label>
        </div>

        <p className="mb-2 text-sm font-semibold text-foreground">Durées prêtes à l&apos;emploi</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => {
            const recommended = preset.hours === suggestedHours;
            return (
              <button
                key={preset.hours}
                type="button"
                onClick={() => applyPreset(preset.hours)}
                className={`rounded-sm border px-3 py-1.5 text-sm font-semibold ${
                  recommended
                    ? "border-primary text-primary hover:bg-primary/5"
                    : "border-border text-foreground hover:border-primary"
                }`}
              >
                {preset.label}
                {recommended && <span className="ml-1 text-xs font-bold">· conseillé</span>}
              </button>
            );
          })}
        </div>

        {start && (
          <p className="mt-3 text-xs text-muted-foreground">
            À partir du {dateFormatter.format(start)}, la remise s&apos;applique sur la boutique dès
            que la campagne est lancée.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-black text-foreground">Aperçu des prix</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Calculé avec la même arithmétique que la boutique et que le message envoyé.
        </p>

        {conflicts.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-sm border border-[#e3a008] bg-[#e3a008]/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" aria-hidden />
            <div className="text-sm">
              <p className="font-bold text-foreground">
                {conflicts.length === 1
                  ? "Un produit est déjà porté par une autre campagne active."
                  : `${conflicts.length} produits sont déjà portés par une autre campagne active.`}
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {conflicts.map((product) => (
                  <li key={product.id}>
                    {product.brand} {product.name} — campagne « {product.conflict?.name} » (
                    {product.conflict?.code}) jusqu&apos;au{" "}
                    {product.conflict && dateFormatter.format(new Date(product.conflict.endsAt))}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-muted-foreground">
                C&apos;est la remise la plus avantageuse qui s&apos;applique en boutique. Le message
                de cette campagne annoncera pourtant son propre prix.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Produit
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Prix catalogue
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Prix affiché
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Économie
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun produit sélectionné à l&apos;étape précédente.
                  </td>
                </tr>
              )}
              {selected.map((product) => {
                const price = discountedPriceCents(
                  product.priceCents,
                  draft.discountKind,
                  draft.discountValue,
                );
                const saved = savingCents(
                  product.priceCents,
                  draft.discountKind,
                  draft.discountValue,
                );
                const percent = effectivePercent(
                  product.priceCents,
                  draft.discountKind,
                  draft.discountValue,
                );

                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-foreground">{product.name}</span>
                      <span className="block text-xs text-muted-foreground">{product.brand}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">
                      {formatCents(product.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-black whitespace-nowrap text-foreground">
                      {showsPrices ? formatCents(price) : "inchangé"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {saved > 0 ? (
                        <span className="font-bold text-primary">
                          −{formatCents(saved)}
                          <span className="ml-1 text-xs font-semibold text-muted-foreground">
                            (−{percent} %)
                          </span>
                        </span>
                      ) : draft.discountKind === "free_shipping" ? (
                        <span className="text-muted-foreground">frais de port offerts</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
