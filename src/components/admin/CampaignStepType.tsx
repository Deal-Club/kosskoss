"use client";

import { Check } from "lucide-react";
import { CAMPAIGN_TYPES, type CampaignType } from "@/lib/campaigns";

/** « 48 heures », « 7 jours » : une durée conseillée se lit en jours dès qu'elle en fait. */
function describeHours(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "1 jour" : `${days} jours`;
  }
  return `${hours} heures`;
}

interface CampaignStepTypeProps {
  name: string;
  type: CampaignType | null;
  onNameChange: (value: string) => void;
  onTypeChange: (value: CampaignType) => void;
}

/**
 * Étape 1 : le nom interne et la nature de la campagne.
 *
 * Le type n'est pas une simple étiquette : il pré-remplit le message, la durée
 * conseillée et la nature de la remise. C'est pour cela qu'il est demandé en
 * premier, avant tout le reste.
 */
export function CampaignStepType({
  name,
  type,
  onNameChange,
  onTypeChange,
}: CampaignStepTypeProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-sm border border-border bg-white p-6">
        <label className="block max-w-xl text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom de la campagne</span>
          <input
            required
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="ex. Lave-linge Bosch — remise de printemps"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Usage interne uniquement. Le client ne voit que l&apos;objet et le contenu du message.
          </span>
        </label>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-black text-foreground">Type de campagne</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Le choix pré-remplit le message et la durée conseillée. Tout reste modifiable ensuite.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CAMPAIGN_TYPES.map((definition) => {
            const selected = definition.type === type;
            return (
              <button
                key={definition.type}
                type="button"
                aria-pressed={selected}
                onClick={() => onTypeChange(definition.type)}
                className={`rounded-sm border p-5 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <span className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-base font-black text-foreground">{definition.label}</span>
                  {selected && (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Choisi
                    </span>
                  )}
                </span>

                <span className="block text-sm text-muted-foreground">{definition.hint}</span>

                <span className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Durée conseillée : {describeHours(definition.suggestedHours)}
                  </span>
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {definition.discountRequired ? "Remise obligatoire" : "Remise facultative"}
                  </span>
                  {definition.allowsFreeShipping && (
                    <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      Livraison offerte possible
                    </span>
                  )}
                  {definition.showsCountdown && (
                    <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      Compte à rebours
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
