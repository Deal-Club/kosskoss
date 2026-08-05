"use client";

import { useRef, useState } from "react";
import { PreviewImage } from "@/components/admin/PreviewImage";
import { formatCents } from "@/lib/cart";
import {
  TEMPLATE_VARIABLES,
  campaignTypeDefinition,
  discountedPriceCents,
  renderTemplate,
  type CampaignLocale,
  type DiscountKind,
  type TemplateVariable,
} from "@/lib/campaigns";
import {
  MESSAGE_FIELDS,
  parseInputValue,
  type CampaignDraft,
  type MessageField,
} from "@/components/admin/campaignDraft";
import type { CampaignProductOption } from "@/server/campaignAdmin";

/** Les huit champs de texte du brouillon, français et anglais confondus. */
type MessageKey =
  | "subject"
  | "headline"
  | "bodyText"
  | "ctaLabel"
  | "subjectEn"
  | "headlineEn"
  | "bodyTextEn"
  | "ctaLabelEn";

const FIELD_KEYS: Record<CampaignLocale, Record<MessageField, MessageKey>> = {
  fr: { subject: "subject", headline: "headline", bodyText: "bodyText", ctaLabel: "ctaLabel" },
  en: {
    subject: "subjectEn",
    headline: "headlineEn",
    bodyText: "bodyTextEn",
    ctaLabel: "ctaLabelEn",
  },
};

const LOCALE_TABS: readonly { locale: CampaignLocale; label: string }[] = [
  { locale: "fr", label: "Français" },
  { locale: "en", label: "Anglais" },
];

/** À quoi sert chaque variable, en une poignée de mots. */
const VARIABLE_HINTS: Record<TemplateVariable, string> = {
  prenom: "prénom du client",
  produit: "nom du produit mis en avant",
  marque: "sa marque",
  prix: "prix de base",
  prix_promo: "prix remisé",
  remise: "l'avantage, « -20 % » ou « -99,80 € »",
  fin: "date de fin de l'offre",
  duree: "durée restante annoncée",
};

const inputClass =
  "w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";

interface CampaignStepMessageProps {
  draft: CampaignDraft;
  products: CampaignProductOption[];
  onChange: (values: Partial<CampaignDraft>) => void;
}

/**
 * Étape 4 : la rédaction du message, en français et en anglais.
 *
 * L'aperçu de droite reproduit le gabarit de src/server/emails/campaign.ts, qui
 * ne peut pas être importé ici : il compose des URL absolues à partir de
 * variables d'environnement, donc il ne quitte jamais le serveur. Les valeurs
 * d'exemple suivent en revanche exactement les mêmes règles — premier produit
 * sélectionné, date de fin de la campagne, remise réelle.
 */
export function CampaignStepMessage({ draft, products, onChange }: CampaignStepMessageProps) {
  const [locale, setLocale] = useState<CampaignLocale>("fr");
  const [activeKey, setActiveKey] = useState<MessageKey | null>(null);
  const fields = useRef<Partial<Record<MessageKey, HTMLInputElement | HTMLTextAreaElement>>>({});

  // L'ordre de sélection est conservé : le premier produit coché est celui qui
  // alimente l'objet du message, exactement comme à l'envoi.
  const selected = draft.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is CampaignProductOption => product !== undefined);
  const lead = selected[0];

  function setField(key: MessageKey, value: string) {
    const values: Partial<CampaignDraft> = {};
    values[key] = value;
    onChange(values);
  }

  /**
   * Insère une variable au curseur du dernier champ touché.
   *
   * Sans champ actif, l'insertion va dans le corps du message : c'est là que
   * les variables servent le plus, et cela vaut mieux que de ne rien faire.
   */
  function insertVariable(name: TemplateVariable) {
    const key = activeKey ?? FIELD_KEYS[locale].bodyText;
    const element = fields.current[key];
    const token = `{${name}}`;
    const current = draft[key];

    if (!element) {
      setField(key, current + token);
      return;
    }

    const from = element.selectionStart ?? current.length;
    const to = element.selectionEnd ?? from;
    setField(key, current.slice(0, from) + token + current.slice(to));

    // Le curseur est replacé après le jeton pour que la frappe puisse
    // reprendre sans clic supplémentaire.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(from + token.length, from + token.length);
    });
  }

  const preview = buildPreview(draft, lead, locale);

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-sm border border-border bg-white text-sm font-bold">
            {LOCALE_TABS.map((tab) => (
              <button
                key={tab.locale}
                type="button"
                aria-pressed={locale === tab.locale}
                onClick={() => setLocale(tab.locale)}
                className={`rounded-sm px-4 py-2 ${
                  locale === tab.locale
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {locale === "fr"
              ? "Version envoyée par défaut."
              : "Envoyée aux comptes en anglais. Vide, elle retombe sur le français."}
          </p>
        </div>

        <div className="rounded-sm border border-border bg-white p-6">
          {MESSAGE_FIELDS.map((field) => {
            const key = FIELD_KEYS[locale][field.key];
            return (
              <label key={key} className="mb-4 block text-sm last:mb-0">
                <span className="mb-1 block font-semibold text-foreground">{field.label}</span>
                {field.rows > 0 ? (
                  <textarea
                    ref={(element) => {
                      // Le champ démonté est oublié : garder une référence vers
                      // un nœud détaché ferait insérer les variables dans le vide.
                      fields.current[key] = element ?? undefined;
                    }}
                    value={draft[key]}
                    rows={field.rows}
                    onFocus={() => setActiveKey(key)}
                    onChange={(event) => setField(key, event.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    ref={(element) => {
                      fields.current[key] = element ?? undefined;
                    }}
                    value={draft[key]}
                    onFocus={() => setActiveKey(key)}
                    onChange={(event) => setField(key, event.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-4 rounded-sm border border-border bg-white p-5">
          <h3 className="text-sm font-black text-foreground">Variables disponibles</h3>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
            Cliquez pour insérer au curseur. Elles sont remplacées à l&apos;envoi, destinataire par
            destinataire.
          </p>
          <ul className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((variable) => (
              <li key={variable}>
                <button
                  type="button"
                  onClick={() => insertVariable(variable)}
                  title={VARIABLE_HINTS[variable]}
                  className="rounded-sm border border-border px-2 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
                >
                  {`{${variable}}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="min-w-0">
        <div className="sticky top-6">
          <h3 className="mb-2 text-sm font-black tracking-wide text-foreground uppercase">
            Aperçu du message
          </h3>

          <div className="overflow-hidden rounded-sm border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-muted px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Objet</p>
              <p className="truncate text-sm font-bold text-foreground">
                {preview.subject || "— objet vide —"}
              </p>
            </div>

            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto bg-[#f1f2f4] p-4">
              <div className="overflow-hidden rounded-sm border border-border bg-white">
                <div className="h-1 bg-primary" />
                <div className="p-5">
                  <p className="mb-3 text-base font-black text-foreground">
                    {preview.headline || "— titre vide —"}
                  </p>

                  {preview.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="mb-3 text-sm leading-6 whitespace-pre-line text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}

                  <p className="my-4">
                    <span className="inline-block rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                      {preview.ctaLabel || "— bouton sans libellé —"}
                    </span>
                  </p>

                  <ul className="space-y-2">
                    {selected.map((product) => {
                      const price = discountedPriceCents(
                        product.priceCents,
                        draft.discountKind,
                        draft.discountValue,
                      );
                      return (
                        <li
                          key={product.id}
                          className="flex items-center gap-3 rounded-sm border border-border p-2"
                        >
                          <PreviewImage
                            src={product.image}
                            alt={`${product.brand} ${product.name}`}
                            wrapperClassName="h-14 w-14 shrink-0 bg-white"
                            imageClassName="object-contain"
                            sizes="56px"
                            compact
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                              {product.brand}
                            </p>
                            <p className="truncate text-sm text-foreground">{product.name}</p>
                            <p className="text-sm">
                              {price < product.priceCents ? (
                                <>
                                  <span className="text-muted-foreground line-through">
                                    {formatCents(product.priceCents)}
                                  </span>{" "}
                                  <span className="font-black text-primary">
                                    {formatCents(price)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-foreground">
                                  {formatCents(product.priceCents)}
                                </span>
                              )}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">
                MLC BOIS · 27 Grande Rue · 21700 Villebichot
                <br />
                Mentions légales · Confidentialité · lien de désinscription
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Valeurs d&apos;exemple prises sur le premier produit sélectionné. Le pied de page légal
            et le lien de désinscription sont ajoutés automatiquement à l&apos;envoi.
          </p>
        </div>
      </aside>
    </section>
  );
}

interface MessagePreview {
  subject: string;
  headline: string;
  paragraphs: string[];
  ctaLabel: string;
}

/** « -20 % », « -99,80 € », ou la mention de livraison offerte. */
function discountLabel(kind: DiscountKind, value: number, locale: CampaignLocale): string {
  switch (kind) {
    case "percent":
      return `-${Math.round(value)} %`;
    case "amount":
      return `-${formatCents(Math.round(value))}`;
    case "free_shipping":
      return locale === "en" ? "Free shipping" : "Livraison offerte";
    case "none":
      return "";
  }
}

/** Durée restante annoncée : « 48 Stunden », « 3 Tage », « 12 hours ». */
function remainingLabel(endsAt: Date | null, locale: CampaignLocale): string {
  if (!endsAt) return "";
  const milliseconds = endsAt.getTime() - Date.now();
  if (milliseconds <= 0) return locale === "en" ? "a few hours" : "wenige Stunden";

  const hours = Math.ceil(milliseconds / 3_600_000);
  if (hours < 48) {
    if (locale === "en") return hours === 1 ? "1 hour" : `${hours} hours`;
    return hours === 1 ? "1 Stunde" : `${hours} Stunden`;
  }
  const days = Math.ceil(hours / 24);
  return locale === "en" ? `${days} days` : `${days} Tage`;
}

/** Rattrape les blancs laissés par une variable vide : « Bonjour  , » → « Bonjour, ». */
function tidy(value: string): string {
  return value
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function buildPreview(
  draft: CampaignDraft,
  lead: CampaignProductOption | undefined,
  locale: CampaignLocale,
): MessagePreview {
  const definition = draft.type ? campaignTypeDefinition(draft.type) : null;
  const fallback = definition ? (locale === "en" ? definition.en : definition.fr) : null;
  const endsAt = parseInputValue(draft.endsAt);

  const price = lead
    ? discountedPriceCents(lead.priceCents, draft.discountKind, draft.discountValue)
    : 0;

  const values: Partial<Record<TemplateVariable, string>> = {
    prenom: "Anna",
    produit: lead?.name ?? "",
    marque: lead?.brand ?? "",
    prix: lead ? formatCents(lead.priceCents) : "",
    prix_promo: lead ? formatCents(price) : "",
    remise: discountLabel(draft.discountKind, draft.discountValue, locale),
    fin: endsAt
      ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Berlin",
        }).format(endsAt)
      : "",
    duree: remainingLabel(endsAt, locale),
  };

  // Repli sur le français quand la variante anglaise est vide, puis sur le
  // modèle du type : la même règle qu'à l'envoi, sinon l'aperçu montrerait un
  // message vide là où le client en recevra un complet.
  const pick = (de: string, en: string, fallbackText: string): string => {
    const chosen = locale === "en" ? en.trim() || de.trim() : de.trim();
    return chosen || fallbackText;
  };

  const bodyText = tidy(
    renderTemplate(pick(draft.bodyText, draft.bodyTextEn, fallback?.bodyText ?? ""), values),
  );

  return {
    subject: tidy(
      renderTemplate(pick(draft.subject, draft.subjectEn, fallback?.subject ?? ""), values),
    ),
    headline: tidy(
      renderTemplate(pick(draft.headline, draft.headlineEn, fallback?.headline ?? ""), values),
    ),
    paragraphs: bodyText
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter((block) => block.length > 0),
    ctaLabel: tidy(
      renderTemplate(pick(draft.ctaLabel, draft.ctaLabelEn, fallback?.ctaLabel ?? ""), values),
    ),
  };
}
