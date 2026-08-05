/**
 * Lecture et traduction des entrées des routes de campagne.
 *
 * Deux responsabilités, toutes deux au service de la couche HTTP :
 *
 *  1. transformer un corps JSON quelconque en `CampaignInput` typé, sans jamais
 *     faire confiance à ce qui arrive — le contrôle métier reste ensuite entier
 *     dans src/server/campaigns.ts, qui est seul à connaître les règles ;
 *  2. traduire les `CampaignError` en phrases françaises. Un code brut comme
 *     « amount_too_high » renvoyé au navigateur obligerait le back-office à
 *     tenir sa propre table de correspondance, qui vieillirait mal.
 *
 * Même partage des rôles que src/server/productInput.ts pour les produits.
 */

import { CampaignError, type CampaignInput } from "@/server/campaigns";
import { formatCents } from "@/lib/cart";
import {
  CADENCE_LIMITS,
  DEFAULT_CADENCE,
  MAX_DISCOUNT_PERCENT,
  isCampaignType,
  type DiscountKind,
} from "@/lib/campaigns";

const DISCOUNT_KINDS: readonly DiscountKind[] = ["percent", "amount", "free_shipping", "none"];

function isDiscountKind(value: unknown): value is DiscountKind {
  return typeof value === "string" && (DISCOUNT_KINDS as readonly string[]).includes(value);
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

/** Entier tolérant : le navigateur envoie parfois « 20 » plutôt que 20. */
function readInteger(source: Record<string, unknown>, key: string, fallback: number): number {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readDate(source: Record<string, unknown>, key: string): Date | null {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface ParsedCampaignInput {
  values: CampaignInput | null;
  /** Message français prêt à être renvoyé, ou null quand la lecture a réussi. */
  error: string | null;
}

/**
 * Lit un corps de requête et en fait un `CampaignInput`.
 *
 * Seules les erreurs de FORME sont détectées ici : type absent, dates
 * illisibles, liste de produits qui n'en est pas une. Les bornes métier
 * (pourcentage maximal, remise inférieure au produit le moins cher, cadence
 * admissible) appartiennent à `createCampaign()` et n'ont pas à être doublées.
 */
export function parseCampaignInput(body: unknown, createdBy?: string): ParsedCampaignInput {
  if (typeof body !== "object" || body === null) {
    return { values: null, error: "Requête invalide." };
  }

  const source = body as Record<string, unknown>;

  const type = readString(source, "type");
  if (!isCampaignType(type)) {
    return { values: null, error: "Type de campagne inconnu." };
  }

  const discountKind = source.discountKind;
  if (!isDiscountKind(discountKind)) {
    return { values: null, error: "Nature de remise inconnue." };
  }

  const startsAt = readDate(source, "startsAt");
  const endsAt = readDate(source, "endsAt");
  if (!startsAt || !endsAt) {
    return { values: null, error: "Les dates de début et de fin sont obligatoires." };
  }

  const rawProducts = source.productIds;
  if (!Array.isArray(rawProducts)) {
    return { values: null, error: "Sélectionnez au moins un produit." };
  }
  const productIds = rawProducts.filter((entry): entry is string => typeof entry === "string");

  return {
    values: {
      name: readString(source, "name"),
      type,
      subject: readString(source, "subject"),
      headline: readString(source, "headline"),
      bodyText: readString(source, "bodyText"),
      ctaLabel: readString(source, "ctaLabel"),
      subjectEn: readString(source, "subjectEn"),
      headlineEn: readString(source, "headlineEn"),
      bodyTextEn: readString(source, "bodyTextEn"),
      ctaLabelEn: readString(source, "ctaLabelEn"),
      discountKind,
      discountValue: readInteger(source, "discountValue", 0),
      startsAt,
      endsAt,
      landingSlug: readString(source, "landingSlug"),
      batchMin: readInteger(source, "batchMin", DEFAULT_CADENCE.batchMin),
      batchMax: readInteger(source, "batchMax", DEFAULT_CADENCE.batchMax),
      delayMinSec: readInteger(source, "delayMinSec", DEFAULT_CADENCE.delayMinSec),
      delayMaxSec: readInteger(source, "delayMaxSec", DEFAULT_CADENCE.delayMaxSec),
      productIds,
      createdBy,
    },
    error: null,
  };
}

/** Minutes lisibles à partir de secondes, pour les messages de cadence. */
function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Phrase française d'une erreur de campagne. Chaque message dit ce qui bloque
 * ET ce qu'il faut faire : l'administrateur est seul devant son écran au moment
 * où il lance un envoi, un « Requête invalide » ne l'aide en rien.
 */
export function campaignErrorMessage(error: CampaignError): string {
  switch (error.code) {
    case "not_found":
      return "Campagne introuvable.";
    case "not_draft":
      return "La campagne a quitté l'état de brouillon : son contenu ne peut plus être modifié ni supprimé.";
    case "not_running":
      return "Cette action ne s'applique pas à l'état actuel de la campagne.";
    case "invalid_name":
      return "Le nom de la campagne doit compter au moins trois caractères.";
    case "invalid_type":
      return "Type de campagne inconnu.";
    case "invalid_dates":
      return "La date de fin doit être postérieure à la date de début.";
    case "discount_required":
      return "Ce type de campagne exige un avantage : une remise ou la livraison offerte.";
    case "invalid_percent":
      return `La remise en pourcentage doit être un nombre entier compris entre 1 et ${MAX_DISCOUNT_PERCENT}.`;
    case "invalid_amount":
      return "La remise en euros doit être un montant supérieur à zéro.";
    case "amount_too_high":
      return error.detail
        ? `La remise dépasse le prix du produit le moins cher de la sélection (${formatCents(Number(error.detail))}). Baissez le montant ou retirez ce produit.`
        : "La remise dépasse le prix du produit le moins cher de la sélection.";
    case "invalid_cadence":
      return (
        `Cadence hors bornes : de ${CADENCE_LIMITS.batchMin} à ${CADENCE_LIMITS.batchMax} messages par lot, ` +
        `et de ${minutes(CADENCE_LIMITS.delayMinSec)} à ${minutes(CADENCE_LIMITS.delayMaxSec)} minutes de pause.`
      );
    case "no_product":
      return "Sélectionnez au moins un produit pour la campagne.";
    case "unknown_product":
      return error.detail
        ? `Produit introuvable ou retiré du catalogue : ${error.detail}.`
        : "Un des produits sélectionnés est introuvable ou retiré du catalogue.";
    case "no_recipient":
      return "Aucun destinataire valide : toutes les adresses sont désinscrites ou déjà en file.";
    case "invalid_email":
      return "Adresse e-mail invalide.";
    case "mail_not_configured":
      return "Aucun fournisseur d'e-mail n'est configuré. Renseignez-le dans les intégrations avant d'envoyer.";
    case "code_collision":
      return "Impossible de générer un code de campagne unique. Réessayez.";
  }
}

/** Code HTTP correspondant : 404 pour l'absence, 409 pour un état incompatible. */
export function campaignErrorStatus(error: CampaignError): number {
  switch (error.code) {
    case "not_found":
      return 404;
    case "not_draft":
    case "not_running":
      return 409;
    case "mail_not_configured":
      return 503;
    case "code_collision":
      return 500;
    default:
      return 400;
  }
}

/** `true` quand l'erreur vient bien du module des campagnes. */
export function isCampaignError(error: unknown): error is CampaignError {
  return error instanceof CampaignError;
}
