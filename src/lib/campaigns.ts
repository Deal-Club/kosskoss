/**
 * Socle commun des campagnes marketing.
 *
 * Ce module ne connaît ni Prisma ni React : il tient les constantes, les
 * calculs purs et les modèles de messages. Il est importé aussi bien par le
 * serveur (application de la remise, répartiteur d'envoi) que par le
 * back-office (aperçu des prix, estimation de durée), exactement comme
 * src/lib/cart.ts l'est pour le panier. Un seul calcul de remise existe, donc
 * l'aperçu affiché à l'administrateur et le prix réellement facturé ne peuvent
 * pas diverger.
 */

// ---- Types ----

/** Les quatre natures de campagne proposées par l'assistant. */
export type CampaignType = "promotion" | "flash" | "nouveaute" | "offre_speciale";

/** brouillon → en_cours → envoyee. « pausee » et « annulee » sont des sorties. */
export type CampaignStatus = "brouillon" | "en_cours" | "envoyee" | "pausee" | "annulee";

/** Nature de l'avantage accordé. */
export type DiscountKind = "percent" | "amount" | "free_shipping" | "none";

/** Statut d'une ligne de la file d'attente. */
export type RecipientStatus = "en_attente" | "envoye" | "echec" | "ignore";

/** Nature d'une entrée du journal. */
export type CampaignEventKind =
  | "envoi"
  | "ouverture"
  | "clic"
  | "commande"
  | "desinscription"
  | "echec";

/** Langues du message. Identique au reste de la boutique. */
export type CampaignLocale = "fr" | "en";

// ---- Constantes ----

/**
 * Cookie posé au clic sur le lien d'un message. Il porte le jeton du
 * destinataire, d'où l'on retrouve la campagne. Lisible par le navigateur :
 * le panier doit pouvoir annoncer « livraison offerte » avant la commande.
 * L'autorité reste au serveur, qui revalide le jeton à la commande.
 */
export const CAMPAIGN_COOKIE = "hgp_camp";

/**
 * Durée de vie du cookie, et donc fenêtre d'attribution : un client qui clique
 * aujourd'hui et commande trois semaines plus tard reste compté.
 */
export const ATTRIBUTION_WINDOW_DAYS = 30;

/** Longueur du jeton de suivi, en octets, avant encodage hexadécimal. */
export const RECIPIENT_TOKEN_BYTES = 32;

/**
 * Bornes acceptées pour la cadence d'envoi. Elles encadrent la saisie du
 * back-office : un lot de 200 messages toutes les dix secondes ferait tomber
 * le domaine dans les filtres anti-spam, et une pause d'une heure rendrait
 * n'importe quelle campagne interminable.
 */
export const CADENCE_LIMITS = {
  batchMin: 1,
  batchMax: 50,
  delayMinSec: 30,
  delayMaxSec: 3_600,
} as const;

/** Réglages par défaut : 3 à 10 messages, puis 3 à 7 minutes de pause. */
export const DEFAULT_CADENCE = {
  batchMin: 3,
  batchMax: 10,
  delayMinSec: 180,
  delayMaxSec: 420,
} as const;

/**
 * Alphabet du code de campagne : ni O ni 0, ni I ni 1. Ce code est lu à voix
 * haute et recopié à la main dans les rapports, les confusions coûtent cher.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// ---- Calcul de la remise ----

/**
 * Prix effectivement payé, remise appliquée.
 *
 * Le résultat ne descend jamais sous un centime : une remise en euros
 * supérieure au prix du produit est une erreur de saisie, pas une intention de
 * donner l'article. Le back-office la refuse en amont, cette borne n'est qu'un
 * dernier garde-fou.
 */
export function discountedPriceCents(
  basePriceCents: number,
  kind: DiscountKind,
  value: number,
): number {
  if (basePriceCents <= 0) return 0;

  switch (kind) {
    case "percent": {
      const percent = clampPercent(value);
      if (percent <= 0) return basePriceCents;
      return Math.max(1, Math.round((basePriceCents * (100 - percent)) / 100));
    }
    case "amount": {
      const amount = Math.max(0, Math.round(value));
      if (amount <= 0) return basePriceCents;
      return Math.max(1, basePriceCents - amount);
    }
    // La livraison offerte ne touche pas au prix de l'article, et « none »
    // couvre l'annonce d'un nouveau produit sans remise de lancement.
    case "free_shipping":
    case "none":
      return basePriceCents;
  }
}

/** Montant réellement économisé, en centimes. Jamais négatif. */
export function savingCents(
  basePriceCents: number,
  kind: DiscountKind,
  value: number,
): number {
  return Math.max(0, basePriceCents - discountedPriceCents(basePriceCents, kind, value));
}

/**
 * Pourcentage réel d'une remise, arrondi. Utilisé pour la pastille du produit :
 * une remise de 100 € sur 499 € s'annonce « -20 % », pas « -100 € », parce que
 * c'est le pourcentage qui parle au client dans une grille de produits.
 */
export function effectivePercent(
  basePriceCents: number,
  kind: DiscountKind,
  value: number,
): number {
  if (basePriceCents <= 0) return 0;
  const saved = savingCents(basePriceCents, kind, value);
  return Math.round((saved / basePriceCents) * 100);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.round(value)));
}

/** Une remise en pourcentage ne peut pas atteindre 100 % : le produit serait gratuit. */
export const MAX_DISCOUNT_PERCENT = 99;

// ---- Cadence d'envoi ----

/**
 * Nombre de messages du prochain lot, tiré au hasard entre les deux bornes.
 *
 * Le hasard n'est pas cosmétique. Un expéditeur qui envoie exactement dix
 * messages toutes les cinq minutes dessine une signature que les filtres de
 * réputation repèrent immédiatement ; un rythme irrégulier ressemble à un
 * envoi humain et protège la délivrabilité du domaine.
 */
export function pickBatchSize(min: number, max: number): number {
  const low = Math.max(CADENCE_LIMITS.batchMin, Math.min(min, max));
  const high = Math.min(CADENCE_LIMITS.batchMax, Math.max(min, max));
  return low + Math.floor(Math.random() * (high - low + 1));
}

/** Pause avant le lot suivant, en secondes, tirée entre les deux bornes. */
export function pickDelaySeconds(min: number, max: number): number {
  const low = Math.max(CADENCE_LIMITS.delayMinSec, Math.min(min, max));
  const high = Math.min(CADENCE_LIMITS.delayMaxSec, Math.max(min, max));
  return low + Math.floor(Math.random() * (high - low + 1));
}

/**
 * Durée totale attendue d'un envoi, en secondes, à partir des moyennes.
 * Sert uniquement à annoncer « environ 2 h 40 » avant de lancer la campagne.
 */
export function estimateSendSeconds(
  recipientCount: number,
  cadence: { batchMin: number; batchMax: number; delayMinSec: number; delayMaxSec: number },
): number {
  if (recipientCount <= 0) return 0;
  const averageBatch = Math.max(1, (cadence.batchMin + cadence.batchMax) / 2);
  const averageDelay = (cadence.delayMinSec + cadence.delayMaxSec) / 2;
  // Le dernier lot n'est suivi d'aucune pause.
  const batches = Math.ceil(recipientCount / averageBatch);
  return Math.round(Math.max(0, batches - 1) * averageDelay);
}

/** « 2 h 40 min », « 45 min », « moins d'une minute ». Pour le back-office, en français. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return "moins d'une minute";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

// ---- Code de campagne ----

/**
 * Code court porté par les liens et recopié sur les commandes attribuées.
 * L'unicité est garantie par la contrainte de base, l'appelant réessaie en cas
 * de collision — 32^6 combinaisons rendent le cas très improbable.
 */
export function generateCampaignCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `CMP-${code}`;
}

// ---- Modèles de messages ----

export interface CampaignTemplate {
  subject: string;
  headline: string;
  bodyText: string;
  ctaLabel: string;
}

export interface CampaignTypeDefinition {
  type: CampaignType;
  /** Libellé du back-office, en français. */
  label: string;
  /** Une phrase d'explication, affichée sur la carte de l'assistant. */
  hint: string;
  /** La remise est-elle obligatoire pour ce type ? */
  discountRequired: boolean;
  /** Le type propose-t-il la livraison offerte comme alternative à la remise ? */
  allowsFreeShipping: boolean;
  /** Un compte à rebours est-il mis en avant dans le message et sur le site ? */
  showsCountdown: boolean;
  /** Durée conseillée en heures, pré-remplie à l'étape des paramètres. */
  suggestedHours: number;
  fr: CampaignTemplate;
  en: CampaignTemplate;
}

/**
 * Variables reconnues dans le sujet et le corps du message. Elles sont
 * remplacées à l'envoi, destinataire par destinataire.
 *
 *   {prenom}      prénom du client, ou une formule neutre s'il est inconnu
 *   {produit}     nom du produit mis en avant
 *   {marque}      sa marque
 *   {prix}        prix de base, formaté (« 499,00 € »)
 *   {prix_promo}  prix remisé, formaté
 *   {remise}      « -20 % » ou « -99,80 € », selon la nature de la remise
 *   {fin}         date de fin de l'offre, dans la langue du destinataire
 *   {duree}       durée restante annoncée (« 48 heures »)
 */
export const TEMPLATE_VARIABLES = [
  "prenom",
  "produit",
  "marque",
  "prix",
  "prix_promo",
  "remise",
  "fin",
  "duree",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/**
 * Les quatre modèles. Les textes français sont ceux réellement envoyés aux
 * clients de la boutique ; l'anglais sert aux comptes dont la langue est « en ».
 * Le ton change franchement d'un type à l'autre — c'est tout l'intérêt d'avoir
 * quatre types plutôt qu'un seul champ libre.
 */
export const CAMPAIGN_TYPES: readonly CampaignTypeDefinition[] = [
  {
    type: "promotion",
    label: "Promotion",
    hint: "Une remise annoncée sur un ou plusieurs produits, sur une période choisie.",
    discountRequired: true,
    allowsFreeShipping: false,
    showsCountdown: false,
    suggestedHours: 168,
    fr: {
      subject: "{remise} sur {produit} – jusqu'au {fin} seulement",
      headline: "{remise} sur {produit}",
      bodyText:
        "Bonjour {prenom},\n\n" +
        "à partir d'aujourd'hui, {marque} {produit} passe à {prix_promo} " +
        "au lieu de {prix}.\n\n" +
        "L'offre court jusqu'au {fin}. Le prix remisé s'applique automatiquement " +
        "dans la boutique.",
      ctaLabel: "Voir l'offre",
    },
    en: {
      subject: "{remise} on {produit} – until {fin} only",
      headline: "{remise} on {produit}",
      bodyText:
        "Hello {prenom},\n\n" +
        "the {marque} {produit} is now available at {prix_promo} instead of {prix}.\n\n" +
        "The offer runs until {fin}. The reduced price is applied automatically in the shop.",
      ctaLabel: "View the offer",
    },
  },
  {
    type: "flash",
    label: "Vente flash",
    hint: "Une remise courte, avec compte à rebours dans le message et sur le site.",
    discountRequired: true,
    allowsFreeShipping: false,
    showsCountdown: true,
    suggestedHours: 48,
    fr: {
      subject: "{duree} seulement : {remise} sur {produit}",
      headline: "Vente flash – {duree} seulement",
      bodyText:
        "Bonjour {prenom},\n\n" +
        "{marque} {produit} à {prix_promo} au lieu de {prix}.\n\n" +
        "L'offre se termine le {fin}. Ensuite le prix habituel revient – " +
        "les quantités sont limitées.",
      ctaLabel: "En profiter",
    },
    en: {
      subject: "{duree} only: {remise} on {produit}",
      headline: "Flash deal – {duree} only",
      bodyText:
        "Hello {prenom},\n\n" +
        "the {marque} {produit} is yours for {prix_promo} instead of {prix}.\n\n" +
        "The deal ends on {fin}. After that the regular price applies again – " +
        "stock is limited.",
      ctaLabel: "Grab the deal",
    },
  },
  {
    type: "nouveaute",
    label: "Nouveau produit",
    hint: "L'annonce d'un article qui entre au catalogue. La remise est facultative.",
    discountRequired: false,
    allowsFreeShipping: false,
    showsCountdown: false,
    suggestedHours: 336,
    fr: {
      subject: "Nouveau au catalogue : {produit}",
      headline: "Nouveau chez MLC Bois",
      bodyText:
        "Bonjour {prenom},\n\n" +
        "{marque} {produit} est disponible dès maintenant, au prix de {prix}.\n\n" +
        "Nous l'avons retenu parce qu'il tient ses promesses. " +
        "Toutes les caractéristiques figurent sur la fiche produit.",
      ctaLabel: "Voir le produit",
    },
    en: {
      subject: "New in our range: {produit}",
      headline: "New at MLC Bois",
      bodyText:
        "Hello {prenom},\n\n" +
        "the {marque} {produit} is now available from us, priced at {prix}.\n\n" +
        "We picked this appliance because it stands out in its class. " +
        "Full specifications are on the product page.",
      ctaLabel: "View the product",
    },
  },
  {
    type: "offre_speciale",
    label: "Offre spéciale",
    hint: "Un avantage réservé aux clients : remise exclusive ou livraison offerte.",
    discountRequired: true,
    allowsFreeShipping: true,
    showsCountdown: false,
    suggestedHours: 168,
    fr: {
      subject: "En exclusivité pour vous : {produit}",
      headline: "Votre offre personnelle",
      bodyText:
        "Bonjour {prenom},\n\n" +
        "nous vous avons réservé une offre sur {marque} {produit} : {remise}.\n\n" +
        "L'avantage s'applique lorsque vous commandez via le lien de cet e-mail, " +
        "et court jusqu'au {fin}.",
      ctaLabel: "Profiter de l'offre",
    },
    en: {
      subject: "Exclusively for you: {produit}",
      headline: "Your personal offer",
      bodyText:
        "Hello {prenom},\n\n" +
        "we have reserved an offer on the {marque} {produit} for you: {remise}.\n\n" +
        "The benefit applies when you order through the link in this email, " +
        "and runs until {fin}.",
      ctaLabel: "Claim the offer",
    },
  },
] as const;

export function campaignTypeDefinition(type: CampaignType): CampaignTypeDefinition {
  const found = CAMPAIGN_TYPES.find((entry) => entry.type === type);
  // Un type inconnu ne peut venir que d'une base modifiée à la main : on
  // retombe sur la promotion plutôt que de faire tomber la page.
  return found ?? CAMPAIGN_TYPES[0];
}

export function isCampaignType(value: string): value is CampaignType {
  return CAMPAIGN_TYPES.some((entry) => entry.type === value);
}

/**
 * Remplace les variables d'un gabarit. Une variable inconnue est laissée telle
 * quelle : mieux vaut un « {machin} » visible dans l'aperçu qu'un trou
 * silencieux dans le message envoyé.
 */
export function renderTemplate(
  template: string,
  values: Partial<Record<TemplateVariable, string>>,
): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, name: string) => {
    const value = values[name as TemplateVariable];
    return value === undefined ? match : value;
  });
}

// ---- Statuts ----

const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  "brouillon",
  "en_cours",
  "envoyee",
  "pausee",
  "annulee",
];

export function isCampaignStatus(value: string): value is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}

/** Libellés français des statuts, pour le back-office. */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  brouillon: "Brouillon",
  en_cours: "Envoi en cours",
  envoyee: "Envoyée",
  pausee: "En pause",
  annulee: "Annulée",
};

/**
 * Une campagne applique-t-elle sa remise sur le site ?
 * Le brouillon ne compte pas — sinon un prix baisserait avant même que le
 * premier message soit parti. L'annulation retire la remise immédiatement.
 */
export function statusAppliesDiscount(status: CampaignStatus): boolean {
  return status === "en_cours" || status === "envoyee" || status === "pausee";
}
