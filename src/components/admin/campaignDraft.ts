/**
 * État de l'assistant de campagne et règles de passage d'une étape à l'autre.
 *
 * Le fichier ne contient aucun composant : il tient la forme du brouillon, les
 * conversions de dates et les contrôles qui autorisent le bouton « Suivant ».
 * Le rendre indépendant de React permet aux cinq étapes de partager exactement
 * la même définition de « valide », sans qu'aucune ne réinvente la sienne.
 *
 * Aucun calcul de remise ici non plus : tout vient de src/lib/campaigns.ts,
 * pour que l'aperçu de l'étape 3 affiche le prix qui sera réellement facturé.
 */

import {
  CADENCE_LIMITS,
  DEFAULT_CADENCE,
  MAX_DISCOUNT_PERCENT,
  campaignTypeDefinition,
  type CampaignType,
  type DiscountKind,
} from "@/lib/campaigns";
import type { CampaignProductOption } from "@/server/campaignAdmin";

export interface CampaignDraft {
  name: string;
  /** Null tant que l'étape 1 n'a pas été franchie : rien n'est pré-choisi. */
  type: CampaignType | null;
  productIds: string[];
  discountKind: DiscountKind;
  /** Pourcentage entier, ou montant en centimes selon `discountKind`. */
  discountValue: number;
  /** Format d'un `<input type="datetime-local">`, donc en heure locale. */
  startsAt: string;
  endsAt: string;
  subject: string;
  headline: string;
  bodyText: string;
  ctaLabel: string;
  subjectEn: string;
  headlineEn: string;
  bodyTextEn: string;
  ctaLabelEn: string;
  batchMin: number;
  batchMax: number;
  delayMinSec: number;
  delayMaxSec: number;
}

/** Champs de message, communs aux deux langues. */
export type MessageField = "subject" | "headline" | "bodyText" | "ctaLabel";

export const MESSAGE_FIELDS: readonly { key: MessageField; label: string; rows: number }[] = [
  { key: "subject", label: "Objet du message", rows: 0 },
  { key: "headline", label: "Titre affiché en tête", rows: 0 },
  { key: "bodyText", label: "Corps du message", rows: 10 },
  { key: "ctaLabel", label: "Libellé du bouton", rows: 0 },
];

// ---- Dates ----

/** Valeur d'un `datetime-local` : « 2026-07-26T14:30 », en heure locale. */
export function toInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Lecture d'une valeur de `datetime-local`. Une chaîne sans fuseau est
 * interprétée en heure locale par la spécification : c'est exactement ce qu'on
 * veut, l'administrateur raisonne à l'heure de sa boutique.
 */
export function parseInputValue(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/** Préréglages de durée proposés à l'étape des paramètres. */
export const DURATION_PRESETS: readonly { hours: number; label: string }[] = [
  { hours: 24, label: "24 h" },
  { hours: 48, label: "48 h" },
  { hours: 168, label: "7 jours" },
  { hours: 336, label: "14 jours" },
];

// ---- Brouillon ----

export function createDraft(): CampaignDraft {
  const now = new Date();
  return {
    name: "",
    type: null,
    productIds: [],
    discountKind: "percent",
    discountValue: 20,
    startsAt: toInputValue(now),
    endsAt: toInputValue(addHours(now, 168)),
    subject: "",
    headline: "",
    bodyText: "",
    ctaLabel: "",
    subjectEn: "",
    headlineEn: "",
    bodyTextEn: "",
    ctaLabelEn: "",
    batchMin: DEFAULT_CADENCE.batchMin,
    batchMax: DEFAULT_CADENCE.batchMax,
    delayMinSec: DEFAULT_CADENCE.delayMinSec,
    delayMaxSec: DEFAULT_CADENCE.delayMaxSec,
  };
}

/**
 * Applique le type choisi : modèles de messages, nature de la remise et durée
 * conseillée. L'appelant ne doit le faire que sur un VRAI changement de type,
 * sinon un retour à l'étape 1 effacerait un message déjà retouché.
 */
export function applyType(draft: CampaignDraft, type: CampaignType): CampaignDraft {
  const definition = campaignTypeDefinition(type);
  const start = parseInputValue(draft.startsAt) ?? new Date();

  return {
    ...draft,
    type,
    subject: definition.fr.subject,
    headline: definition.fr.headline,
    bodyText: definition.fr.bodyText,
    ctaLabel: definition.fr.ctaLabel,
    subjectEn: definition.en.subject,
    headlineEn: definition.en.headline,
    bodyTextEn: definition.en.bodyText,
    ctaLabelEn: definition.en.ctaLabel,
    // Un type sans remise obligatoire annonce d'abord un produit : la remise
    // reste possible, elle n'est simplement plus le choix par défaut.
    discountKind: definition.discountRequired ? "percent" : "none",
    discountValue: definition.discountRequired ? draft.discountValue || 20 : 0,
    endsAt: toInputValue(addHours(start, definition.suggestedHours)),
  };
}

/** Corps JSON envoyé aux routes de campagne. */
export function draftToPayload(draft: CampaignDraft): Record<string, unknown> {
  return {
    name: draft.name,
    type: draft.type,
    subject: draft.subject,
    headline: draft.headline,
    bodyText: draft.bodyText,
    ctaLabel: draft.ctaLabel,
    subjectEn: draft.subjectEn,
    headlineEn: draft.headlineEn,
    bodyTextEn: draft.bodyTextEn,
    ctaLabelEn: draft.ctaLabelEn,
    discountKind: draft.discountKind,
    discountValue: draft.discountValue,
    startsAt: parseInputValue(draft.startsAt)?.toISOString() ?? "",
    endsAt: parseInputValue(draft.endsAt)?.toISOString() ?? "",
    // Laissé vide : les liens du message pointent alors vers la fiche produit,
    // ce qui reste la destination la plus directe. Une page d'action dédiée
    // suppose que /promo/<slug> existe, ce que l'assistant ne peut pas garantir.
    landingSlug: "",
    batchMin: draft.batchMin,
    batchMax: draft.batchMax,
    delayMinSec: draft.delayMinSec,
    delayMaxSec: draft.delayMaxSec,
    productIds: draft.productIds,
  };
}

// ---- Contrôles d'étape ----

/** Prix du produit le moins cher de la sélection, en centimes. 0 si aucune. */
export function cheapestSelectedCents(
  draft: CampaignDraft,
  products: readonly CampaignProductOption[],
): number {
  const selected = products.filter((product) => draft.productIds.includes(product.id));
  if (selected.length === 0) return 0;
  return Math.min(...selected.map((product) => product.priceCents));
}

/**
 * Motif qui empêche de quitter l'étape, ou null si tout va bien.
 *
 * Une phrase plutôt qu'un booléen : un bouton « Suivant » grisé sans explication
 * est la première cause d'abandon d'un formulaire en plusieurs étapes.
 */
export function stepIssue(
  step: number,
  draft: CampaignDraft,
  context: { products: readonly CampaignProductOption[]; recipientCount: number },
): string | null {
  switch (step) {
    case 1:
      if (draft.name.trim().length < 3) return "Donnez un nom d'au moins trois caractères.";
      if (!draft.type) return "Choisissez le type de campagne.";
      return null;

    case 2:
      if (draft.productIds.length === 0) return "Sélectionnez au moins un produit.";
      return null;

    case 3:
      return settingsIssue(draft, context.products);

    case 4: {
      const missing = MESSAGE_FIELDS.filter((field) => draft[field.key].trim().length === 0);
      if (missing.length > 0) {
        return `Complétez le message en français : ${missing.map((field) => field.label.toLowerCase()).join(", ")}.`;
      }
      return null;
    }

    case 5:
      if (context.recipientCount === 0) return "Sélectionnez au moins un destinataire.";
      return cadenceIssue(draft);

    default:
      return null;
  }
}

function settingsIssue(
  draft: CampaignDraft,
  products: readonly CampaignProductOption[],
): string | null {
  const start = parseInputValue(draft.startsAt);
  const end = parseInputValue(draft.endsAt);
  if (!start || !end) return "Renseignez la date de début et la date de fin.";
  if (end.getTime() <= start.getTime()) {
    return "La date de fin doit être postérieure à la date de début.";
  }

  const definition = draft.type ? campaignTypeDefinition(draft.type) : null;
  if (definition?.discountRequired && draft.discountKind === "none") {
    return "Ce type de campagne exige un avantage : une remise ou la livraison offerte.";
  }
  if (draft.discountKind === "free_shipping" && !definition?.allowsFreeShipping) {
    return "Ce type de campagne ne propose pas la livraison offerte.";
  }

  if (draft.discountKind === "percent") {
    if (!Number.isInteger(draft.discountValue) || draft.discountValue < 1) {
      return "Indiquez un pourcentage de remise d'au moins 1 %.";
    }
    if (draft.discountValue > MAX_DISCOUNT_PERCENT) {
      return `La remise ne peut pas dépasser ${MAX_DISCOUNT_PERCENT} %.`;
    }
  }

  if (draft.discountKind === "amount") {
    if (!Number.isInteger(draft.discountValue) || draft.discountValue < 1) {
      return "Indiquez un montant de remise supérieur à zéro.";
    }
    const cheapest = cheapestSelectedCents(draft, products);
    if (cheapest > 0 && draft.discountValue >= cheapest) {
      return "La remise dépasse le prix du produit le moins cher de la sélection.";
    }
  }

  return null;
}

function cadenceIssue(draft: CampaignDraft): string | null {
  if (draft.batchMin < CADENCE_LIMITS.batchMin || draft.batchMax > CADENCE_LIMITS.batchMax) {
    return `Le lot doit compter entre ${CADENCE_LIMITS.batchMin} et ${CADENCE_LIMITS.batchMax} messages.`;
  }
  if (draft.batchMin > draft.batchMax) {
    return "Le minimum du lot ne peut pas dépasser son maximum.";
  }
  if (
    draft.delayMinSec < CADENCE_LIMITS.delayMinSec ||
    draft.delayMaxSec > CADENCE_LIMITS.delayMaxSec
  ) {
    return (
      `La pause doit durer entre ${Math.round(CADENCE_LIMITS.delayMinSec / 60)} et ` +
      `${Math.round(CADENCE_LIMITS.delayMaxSec / 60)} minutes.`
    );
  }
  if (draft.delayMinSec > draft.delayMaxSec) {
    return "La pause minimale ne peut pas dépasser la pause maximale.";
  }
  return null;
}
