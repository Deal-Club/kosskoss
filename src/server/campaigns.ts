/**
 * Campagnes marketing : création, cycle de vie et mesure.
 *
 * Le module ne compose aucun message et n'en envoie qu'un seul — celui de test.
 * Le rendu vit dans src/server/emails/campaign.ts et l'envoi de masse dans
 * src/server/campaignDispatcher.ts. Cette séparation n'est pas cosmétique : le
 * répartiteur tourne en tâche de fond, souvent hors de toute requête HTTP, alors
 * que ce fichier-ci est appelé par le back-office. Les mélanger reviendrait à
 * exposer le verrou d'envoi à des appels d'interface.
 *
 * Les calculs de remise et de cadence ne sont jamais refaits ici : ils viennent
 * tous de src/lib/campaigns.ts, seul endroit où ils existent, pour que le prix
 * affiché dans l'aperçu du back-office soit exactement celui du message.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/server/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { slugify } from "@/lib/slugify";
import {
  CADENCE_LIMITS,
  MAX_DISCOUNT_PERCENT,
  RECIPIENT_TOKEN_BYTES,
  campaignTypeDefinition,
  discountedPriceCents,
  generateCampaignCode,
  isCampaignStatus,
  isCampaignType,
  type CampaignEventKind,
  type CampaignLocale,
  type CampaignStatus,
  type CampaignType,
  type DiscountKind,
  type RecipientStatus,
} from "@/lib/campaigns";
import { buildCampaignEmail } from "@/server/emails/campaign";
import { listContacts } from "@/server/contacts";

// ---- Erreurs ----

/** Codes lisibles ; la couche HTTP les traduit, comme pour `OrderError`. */
export type CampaignErrorCode =
  | "not_found"
  | "not_draft"
  | "not_running"
  | "invalid_name"
  | "invalid_type"
  | "invalid_dates"
  | "discount_required"
  | "invalid_percent"
  | "invalid_amount"
  | "amount_too_high"
  | "invalid_cadence"
  | "no_product"
  | "unknown_product"
  | "no_recipient"
  | "invalid_email"
  | "mail_not_configured"
  | "code_collision";

export class CampaignError extends Error {
  readonly code: CampaignErrorCode;
  /** Précision affichable : nom du produit fautif, borne dépassée… */
  readonly detail?: string;

  constructor(code: CampaignErrorCode, detail?: string) {
    super(code);
    this.name = "CampaignError";
    this.code = code;
    this.detail = detail;
  }
}

// ---- Vues publiques ----

export interface CampaignProductView {
  productId: string;
  name: string;
  brand: string;
  image: string;
  /** Chemin de la fiche produit, préfixé par « / ». */
  path: string;
  /** Prix figé à l'entrée dans la campagne : c'est lui qui s'affiche barré. */
  basePriceCents: number;
  /** Prix remisé, recalculé à la lecture — jamais stocké, jamais divergent. */
  priceCents: number;
}

export interface CampaignSummary {
  id: string;
  code: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  discountKind: DiscountKind;
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  productCount: number;
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  orderCount: number;
  revenueCents: number;
  unsubscribedCount: number;
  createdAt: Date;
}

export interface CampaignDetail extends CampaignSummary {
  subject: string;
  headline: string;
  bodyText: string;
  ctaLabel: string;
  subjectEn: string;
  headlineEn: string;
  bodyTextEn: string;
  ctaLabelEn: string;
  landingSlug: string;
  batchMin: number;
  batchMax: number;
  delayMinSec: number;
  delayMaxSec: number;
  nextBatchAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  products: CampaignProductView[];
}

export interface RecipientView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: CampaignLocale;
  status: RecipientStatus;
  error: string;
  sentAt: Date | null;
  openedAt: Date | null;
  firstClickedAt: Date | null;
  clickCount: number;
  unsubscribedAt: Date | null;
  attributedCents: number;
}

/** Un point de la courbe : une journée, une colonne par nature d'événement. */
export interface CampaignStatsPoint {
  /** Jour au format « 2026-07-26 », heure de Berlin. */
  day: string;
  envoi: number;
  ouverture: number;
  clic: number;
  commande: number;
  desinscription: number;
  echec: number;
}

export interface CampaignStats {
  recipientCount: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  ignoredCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  orderCount: number;
  revenueCents: number;
  /** Taux en points de pourcentage, arrondis, rapportés aux messages partis. */
  openRate: number;
  clickRate: number;
  series: CampaignStatsPoint[];
}

export interface CampaignInput {
  name: string;
  type: CampaignType;
  subject: string;
  headline: string;
  bodyText: string;
  ctaLabel: string;
  subjectEn: string;
  headlineEn: string;
  bodyTextEn: string;
  ctaLabelEn: string;
  discountKind: DiscountKind;
  /** Pourcentage entier, ou montant en centimes selon `discountKind`. */
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  landingSlug: string;
  batchMin: number;
  batchMax: number;
  delayMinSec: number;
  delayMaxSec: number;
  productIds: readonly string[];
  createdBy?: string;
}

// ---- Conversions ----

function toType(value: string): CampaignType {
  return isCampaignType(value) ? value : "promotion";
}

function toStatus(value: string): CampaignStatus {
  return isCampaignStatus(value) ? value : "brouillon";
}

const DISCOUNT_KINDS: readonly DiscountKind[] = ["percent", "amount", "free_shipping", "none"];

function toDiscountKind(value: string): DiscountKind {
  return (DISCOUNT_KINDS as readonly string[]).includes(value) ? (value as DiscountKind) : "none";
}

const RECIPIENT_STATUSES: readonly RecipientStatus[] = ["en_attente", "envoye", "echec", "ignore"];

function toRecipientStatus(value: string): RecipientStatus {
  return (RECIPIENT_STATUSES as readonly string[]).includes(value)
    ? (value as RecipientStatus)
    : "en_attente";
}

function toLocale(value: string): CampaignLocale {
  return value === "en" ? "en" : "fr";
}

/** Sélection commune des produits : de quoi bâtir une carte de message. */
const productSelect = {
  id: true,
  name: true,
  brand: true,
  slug: true,
  image: true,
  priceCents: true,
  active: true,
  category: {
    select: { slug: true, image: true, group: { select: { slug: true } } },
  },
} as const;

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  slug: string;
  image: string | null;
  priceCents: number;
  active: boolean;
  category: { slug: string; image: string; group: { slug: string } };
};

function productPath(row: ProductRow): string {
  return `/${row.category.group.slug}/${row.category.slug}/${row.slug}`;
}

/** Sans visuel propre, le produit reprend l'image de sa catégorie — même règle qu'au catalogue. */
function productImage(row: ProductRow): string {
  return row.image || row.category.image;
}

// ---- Mesures ----

interface Metrics {
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  orderCount: number;
  revenueCents: number;
}

const EMPTY_METRICS: Metrics = {
  sentCount: 0,
  openedCount: 0,
  clickedCount: 0,
  unsubscribedCount: 0,
  orderCount: 0,
  revenueCents: 0,
};

/**
 * Compteurs de toutes les campagnes (ou d'une seule) en six requêtes groupées.
 *
 * Six requêtes constantes valent mieux que six par campagne : la liste du
 * back-office affiche toutes les campagnes d'un coup, et une agrégation par
 * ligne rendrait la page inutilisable dès la dixième.
 */
async function loadMetrics(ids?: readonly string[]): Promise<Map<string, Metrics>> {
  const scope = ids ? { campaignId: { in: [...ids] } } : {};

  const [sent, opened, clicked, unsubscribed, revenue, orders] = await Promise.all([
    prisma.campaignRecipient.groupBy({
      by: ["campaignId"],
      where: { ...scope, status: "envoye" },
      _count: { _all: true },
    }),
    prisma.campaignRecipient.groupBy({
      by: ["campaignId"],
      where: { ...scope, openedAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.campaignRecipient.groupBy({
      by: ["campaignId"],
      where: { ...scope, firstClickedAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.campaignRecipient.groupBy({
      by: ["campaignId"],
      where: { ...scope, unsubscribedAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.campaignRecipient.groupBy({
      by: ["campaignId"],
      where: scope,
      _sum: { attributedCents: true },
    }),
    prisma.order.groupBy({
      by: ["campaignId"],
      where: ids ? { campaignId: { in: [...ids] } } : { campaignId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const metrics = new Map<string, Metrics>();

  function entry(campaignId: string): Metrics {
    const found = metrics.get(campaignId);
    if (found) return found;
    const created = { ...EMPTY_METRICS };
    metrics.set(campaignId, created);
    return created;
  }

  for (const row of sent) entry(row.campaignId).sentCount = row._count._all;
  for (const row of opened) entry(row.campaignId).openedCount = row._count._all;
  for (const row of clicked) entry(row.campaignId).clickedCount = row._count._all;
  for (const row of unsubscribed) entry(row.campaignId).unsubscribedCount = row._count._all;
  for (const row of revenue) entry(row.campaignId).revenueCents = row._sum.attributedCents ?? 0;
  for (const row of orders) {
    // `campaignId` est facultatif sur une commande : les commandes sans
    // campagne ne sont attribuées à personne, c'est ce qui rend le chiffre
    // d'affaires exploitable.
    if (!row.campaignId) continue;
    entry(row.campaignId).orderCount = row._count._all;
  }

  return metrics;
}

interface CampaignRow {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  discountKind: string;
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  _count: { products: number; recipients: number };
}

function toSummary(row: CampaignRow, metrics: Metrics): CampaignSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: toType(row.type),
    status: toStatus(row.status),
    discountKind: toDiscountKind(row.discountKind),
    discountValue: row.discountValue,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    productCount: row._count.products,
    recipientCount: row._count.recipients,
    sentCount: metrics.sentCount,
    openedCount: metrics.openedCount,
    clickedCount: metrics.clickedCount,
    orderCount: metrics.orderCount,
    revenueCents: metrics.revenueCents,
    unsubscribedCount: metrics.unsubscribedCount,
    createdAt: row.createdAt,
  };
}

// ---- Lecture ----

export async function listCampaigns(): Promise<CampaignSummary[]> {
  const rows = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      status: true,
      discountKind: true,
      discountValue: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
      _count: { select: { products: true, recipients: true } },
    },
  });

  const metrics = await loadMetrics();
  return rows.map((row) => toSummary(row, metrics.get(row.id) ?? EMPTY_METRICS));
}

export async function getCampaign(id: string): Promise<CampaignDetail | undefined> {
  const row = await prisma.campaign.findUnique({
    where: { id },
    include: {
      products: { include: { product: { select: productSelect } } },
      _count: { select: { products: true, recipients: true } },
    },
  });
  if (!row) return undefined;

  const metrics = (await loadMetrics([id])).get(id) ?? EMPTY_METRICS;
  const kind = toDiscountKind(row.discountKind);

  const products: CampaignProductView[] = row.products.map((entry) => ({
    productId: entry.productId,
    name: entry.product.name,
    brand: entry.product.brand,
    image: productImage(entry.product),
    path: productPath(entry.product),
    basePriceCents: entry.basePriceCents,
    priceCents: discountedPriceCents(entry.basePriceCents, kind, row.discountValue),
  }));

  return {
    ...toSummary(row, metrics),
    subject: row.subject,
    headline: row.headline,
    bodyText: row.bodyText,
    ctaLabel: row.ctaLabel,
    subjectEn: row.subjectEn,
    headlineEn: row.headlineEn,
    bodyTextEn: row.bodyTextEn,
    ctaLabelEn: row.ctaLabelEn,
    landingSlug: row.landingSlug,
    batchMin: row.batchMin,
    batchMax: row.batchMax,
    delayMinSec: row.delayMinSec,
    delayMaxSec: row.delayMaxSec,
    nextBatchAt: row.nextBatchAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    products,
  };
}

// ---- Validation ----

async function loadProducts(productIds: readonly string[]): Promise<ProductRow[]> {
  const unique = [...new Set(productIds.map((value) => value.trim()).filter(Boolean))];
  if (unique.length === 0) throw new CampaignError("no_product");

  const rows = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: productSelect,
  });

  if (rows.length !== unique.length) {
    const found = new Set(rows.map((row) => row.id));
    const missing = unique.find((id) => !found.has(id));
    throw new CampaignError("unknown_product", missing);
  }

  const inactive = rows.find((row) => !row.active);
  // Annoncer un produit retiré du catalogue, c'est envoyer le client sur une
  // page qui n'existe plus : autant le refuser à la saisie.
  if (inactive) throw new CampaignError("unknown_product", `${inactive.brand} ${inactive.name}`);

  return rows;
}

/**
 * Contrôles refusés à la création comme à la modification.
 *
 * Tout est vérifié ici plutôt que dans le formulaire : une campagne mal formée
 * ne coûte pas un affichage bancal, elle coûte un message parti chez des
 * milliers de clients avec un prix faux.
 */
function validateInput(input: CampaignInput, products: readonly ProductRow[]): void {
  if (input.name.trim().length < 3) throw new CampaignError("invalid_name");
  if (!isCampaignType(input.type)) throw new CampaignError("invalid_type");
  if (products.length === 0) throw new CampaignError("no_product");

  if (
    !(input.startsAt instanceof Date) ||
    !(input.endsAt instanceof Date) ||
    Number.isNaN(input.startsAt.getTime()) ||
    Number.isNaN(input.endsAt.getTime()) ||
    input.endsAt.getTime() <= input.startsAt.getTime()
  ) {
    throw new CampaignError("invalid_dates");
  }

  const definition = campaignTypeDefinition(input.type);
  const kind = input.discountKind;

  if (definition.discountRequired) {
    if (kind === "none") throw new CampaignError("discount_required");
    if (kind === "free_shipping" && !definition.allowsFreeShipping) {
      throw new CampaignError("discount_required");
    }
  }

  if (kind === "percent") {
    if (!Number.isInteger(input.discountValue) || input.discountValue < 1) {
      throw new CampaignError("invalid_percent");
    }
    if (input.discountValue > MAX_DISCOUNT_PERCENT) throw new CampaignError("invalid_percent");
  }

  if (kind === "amount") {
    if (!Number.isInteger(input.discountValue) || input.discountValue < 1) {
      throw new CampaignError("invalid_amount");
    }
    // La remise se compare au produit le MOINS cher de la sélection : sinon un
    // même montant offrirait l'article d'entrée de gamme.
    const cheapest = Math.min(...products.map((row) => row.priceCents));
    if (input.discountValue >= cheapest) {
      throw new CampaignError("amount_too_high", String(cheapest));
    }
  }

  const cadence = [
    input.batchMin >= CADENCE_LIMITS.batchMin,
    input.batchMax <= CADENCE_LIMITS.batchMax,
    input.batchMin <= input.batchMax,
    input.delayMinSec >= CADENCE_LIMITS.delayMinSec,
    input.delayMaxSec <= CADENCE_LIMITS.delayMaxSec,
    input.delayMinSec <= input.delayMaxSec,
  ];
  if (cadence.includes(false)) throw new CampaignError("invalid_cadence");
}

/** Une valeur de remise n'a de sens que pour un pourcentage ou un montant. */
function normalizedDiscountValue(kind: DiscountKind, value: number): number {
  return kind === "percent" || kind === "amount" ? Math.round(value) : 0;
}

function contentFields(input: CampaignInput) {
  return {
    name: input.name.trim(),
    type: input.type,
    subject: input.subject.trim(),
    headline: input.headline.trim(),
    bodyText: input.bodyText.trim(),
    ctaLabel: input.ctaLabel.trim(),
    subjectEn: input.subjectEn.trim(),
    headlineEn: input.headlineEn.trim(),
    bodyTextEn: input.bodyTextEn.trim(),
    ctaLabelEn: input.ctaLabelEn.trim(),
    discountKind: input.discountKind,
    discountValue: normalizedDiscountValue(input.discountKind, input.discountValue),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    landingSlug: input.landingSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
    batchMin: input.batchMin,
    batchMax: input.batchMax,
    delayMinSec: input.delayMinSec,
    delayMaxSec: input.delayMaxSec,
  };
}

/**
 * Adresse de la page d'action, calculée d'office.
 *
 * Elle n'a de sens qu'à partir de deux produits : avec un seul, le lien du
 * message mène directement à sa fiche, ce qui fait une page de moins entre le
 * client et le bouton d'achat. Au-delà, sans page d'action le message ne
 * pourrait renvoyer que vers un article et les autres resteraient invisibles.
 *
 * Le code de la campagne sert de suffixe : il est déjà unique en base, la page
 * l'est donc aussi sans qu'il faille une contrainte de plus.
 */
function defaultLandingSlug(name: string, code: string, productCount: number): string {
  if (productCount < 2) return "";
  const suffix = code.replace(/^CMP-/, "").toLowerCase();
  const base = slugify(name).slice(0, 48).replace(/-+$/, "");
  return base ? `${base}-${suffix}` : suffix;
}

/** Violation de contrainte d'unicité renvoyée par Prisma. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// ---- Écriture ----

export async function createCampaign(input: CampaignInput): Promise<CampaignDetail> {
  const products = await loadProducts(input.productIds);
  validateInput(input, products);

  const fields = contentFields(input);

  // Le code est tiré au hasard sur 32^6 combinaisons : la collision est
  // improbable mais pas impossible, et c'est la base qui tranche. Quelques
  // reprises suffisent, une boucle infinie ne se justifierait pas.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCampaignCode();

    try {
      const created = await prisma.campaign.create({
        data: {
          ...fields,
          code,
          landingSlug: fields.landingSlug || defaultLandingSlug(fields.name, code, products.length),
          status: "brouillon",
          createdBy: input.createdBy ?? "",
          products: {
            create: products.map((product) => ({
              productId: product.id,
              // Prix figé maintenant : si le catalogue bouge demain, le client
              // retrouvera quand même la remise annoncée dans le message.
              basePriceCents: product.priceCents,
            })),
          },
        },
        select: { id: true },
      });

      const detail = await getCampaign(created.id);
      if (!detail) throw new CampaignError("not_found");
      return detail;
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  throw new CampaignError("code_collision");
}

/**
 * Modification. Refusée dès que la campagne est sortie du brouillon : changer
 * un prix ou une date après le premier envoi ferait mentir les messages déjà
 * partis.
 */
export async function updateCampaign(
  id: string,
  input: CampaignInput,
): Promise<CampaignDetail | undefined> {
  const current = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true, code: true },
  });
  if (!current) return undefined;
  if (toStatus(current.status) !== "brouillon") throw new CampaignError("not_draft");

  const products = await loadProducts(input.productIds);
  validateInput(input, products);

  const fields = contentFields(input);

  await prisma.campaign.update({
    where: { id },
    data: {
      ...fields,
      // Recalculée à chaque enregistrement du brouillon : ajouter un second
      // produit doit faire apparaître la page d'action, en retirer un doit la
      // faire disparaître. Rien n'est encore parti, l'adresse peut bouger.
      landingSlug:
        fields.landingSlug || defaultLandingSlug(fields.name, current.code, products.length),
      products: {
        // Remplacement franc : la sélection de produits est un tout, un
        // rapprochement ligne à ligne n'apporterait qu'un risque de doublon.
        deleteMany: {},
        create: products.map((product) => ({
          productId: product.id,
          basePriceCents: product.priceCents,
        })),
      },
    },
  });

  return getCampaign(id);
}

/** Suppression réservée au brouillon : une campagne partie garde ses statistiques. */
export async function deleteCampaign(id: string): Promise<boolean> {
  const current = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!current) return false;
  if (toStatus(current.status) !== "brouillon") throw new CampaignError("not_draft");

  await prisma.campaign.delete({ where: { id } });
  return true;
}

// ---- Lancement ----

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Fige la liste des destinataires et met la campagne en route.
 *
 * Fige, au sens propre : une ligne par adresse, avec le nom et la langue tels
 * qu'ils étaient à cet instant. Un client qui change de prénom demain recevra
 * quand même le message préparé aujourd'hui — c'est voulu, la file d'attente ne
 * doit pas bouger sous les pieds du répartiteur.
 *
 * Les adresses désinscrites sont écartées ici, avant même d'entrer dans la
 * file : une ligne « ignore » dans la base resterait un envoi possible en cas
 * de reprise manuelle.
 */
export async function launchCampaign(
  id: string,
  emails: readonly string[],
): Promise<{ queued: number; skipped: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!campaign) throw new CampaignError("not_found");
  if (toStatus(campaign.status) !== "brouillon") throw new CampaignError("not_draft");

  const wanted = [...new Set(emails.map(normalizeEmail).filter((email) => email.includes("@")))];
  if (wanted.length === 0) throw new CampaignError("no_recipient");

  const [suppressions, existing, contacts] = await Promise.all([
    prisma.emailSuppression.findMany({ where: { email: { in: wanted } }, select: { email: true } }),
    prisma.campaignRecipient.findMany({ where: { campaignId: id }, select: { email: true } }),
    listContacts(),
  ]);

  const blocked = new Set(suppressions.map((row) => normalizeEmail(row.email)));
  const already = new Set(existing.map((row) => normalizeEmail(row.email)));
  const byEmail = new Map(contacts.map((contact) => [contact.email, contact]));

  const rows = wanted
    .filter((email) => !blocked.has(email) && !already.has(email))
    .map((email) => {
      const contact = byEmail.get(email);
      return {
        campaignId: id,
        customerId: contact?.customerId ?? null,
        email,
        firstName: contact?.firstName ?? "",
        lastName: contact?.lastName ?? "",
        locale: contact?.locale ?? "fr",
        // Jeton porté en clair par les liens du message : il doit être
        // imprévisible, sans quoi n'importe qui désinscrirait un client ou
        // gonflerait les ouvertures.
        token: randomBytes(RECIPIENT_TOKEN_BYTES).toString("hex"),
        status: "en_attente",
      };
    });

  if (rows.length === 0 && already.size === 0) throw new CampaignError("no_recipient");

  // `skipDuplicates` n'existe pas sous SQLite : les doublons sont déjà retirés
  // ci-dessus, l'insertion groupée reste donc valable sur les deux moteurs.
  if (rows.length > 0) await prisma.campaignRecipient.createMany({ data: rows });

  const now = new Date();
  await prisma.campaign.update({
    where: { id },
    data: { status: "en_cours", startedAt: now, nextBatchAt: now, completedAt: null },
  });

  return { queued: rows.length, skipped: wanted.length - rows.length };
}

export async function pauseCampaign(id: string): Promise<void> {
  const current = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new CampaignError("not_found");
  if (toStatus(current.status) !== "en_cours") throw new CampaignError("not_running");

  // `nextBatchAt` est effacé : le répartiteur ignore déjà les campagnes en
  // pause, mais une heure de lot laissée en place ferait repartir l'envoi si le
  // statut était rétabli à la main.
  await prisma.campaign.update({ where: { id }, data: { status: "pausee", nextBatchAt: null } });
}

export async function resumeCampaign(id: string): Promise<void> {
  const current = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new CampaignError("not_found");
  if (toStatus(current.status) !== "pausee") throw new CampaignError("not_running");

  await prisma.campaign.update({
    where: { id },
    data: { status: "en_cours", nextBatchAt: new Date() },
  });
}

/**
 * Annulation définitive. Les destinataires encore en file passent en « ignore »
 * plutôt que d'être supprimés : le back-office doit pouvoir dire combien de
 * personnes n'ont finalement rien reçu.
 */
export async function cancelCampaign(id: string): Promise<void> {
  const current = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new CampaignError("not_found");

  const status = toStatus(current.status);
  if (status === "annulee") return;

  await prisma.campaignRecipient.updateMany({
    where: { campaignId: id, status: "en_attente" },
    data: { status: "ignore" },
  });

  await prisma.campaign.update({
    where: { id },
    data: { status: "annulee", nextBatchAt: null, completedAt: new Date() },
  });
}

/**
 * Remet les échecs en file. Utile après une coupure du fournisseur : les
 * adresses réellement invalides échoueront de nouveau et se verront reléguées
 * au même endroit, sans effet de bord sur les messages déjà partis.
 */
export async function retryFailedRecipients(id: string): Promise<number> {
  const current = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new CampaignError("not_found");

  const status = toStatus(current.status);
  if (status === "brouillon" || status === "annulee") throw new CampaignError("not_running");

  const { count } = await prisma.campaignRecipient.updateMany({
    where: { campaignId: id, status: "echec" },
    data: { status: "en_attente", error: "" },
  });
  if (count === 0) return 0;

  // Une campagne déjà close repart : elle n'est plus « envoyée » tant qu'il
  // reste quelqu'un en file. Une campagne en pause, elle, reste en pause —
  // c'est « reprendre » qui la relance, pas cette fonction.
  if (status === "envoyee") {
    await prisma.campaign.update({
      where: { id },
      data: { status: "en_cours", nextBatchAt: new Date(), completedAt: null },
    });
  } else if (status === "en_cours") {
    await prisma.campaign.update({ where: { id }, data: { nextBatchAt: new Date() } });
  }

  return count;
}

/**
 * Envoi d'essai vers l'adresse de l'administrateur.
 *
 * Le jeton est factice et préfixé : les liens de suivi ne mèneront nulle part,
 * ce qui est exactement l'effet recherché — un test ne doit ni compter dans les
 * statistiques ni permettre de désinscrire qui que ce soit. Le message part en
 * français, langue de la boutique.
 */
export async function sendTestEmail(id: string, email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new CampaignError("invalid_email");
  if (!isMailConfigured()) throw new CampaignError("mail_not_configured");

  const campaign = await getCampaign(id);
  if (!campaign) throw new CampaignError("not_found");

  const message = buildCampaignEmail({
    campaign,
    products: campaign.products,
    recipient: {
      token: `test-${randomBytes(16).toString("hex")}`,
      firstName: "",
      locale: "fr",
    },
  });

  await sendMail({ to: normalized, ...message, subject: `[Test] ${message.subject}` });
}

// ---- Destinataires et mesures ----

export async function listRecipients(id: string): Promise<RecipientView[]> {
  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: [{ status: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      locale: true,
      status: true,
      error: true,
      sentAt: true,
      openedAt: true,
      firstClickedAt: true,
      clickCount: true,
      unsubscribedAt: true,
      attributedCents: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    locale: toLocale(row.locale),
    status: toRecipientStatus(row.status),
    error: row.error,
    sentAt: row.sentAt,
    openedAt: row.openedAt,
    firstClickedAt: row.firstClickedAt,
    clickCount: row.clickCount,
    unsubscribedAt: row.unsubscribedAt,
    attributedCents: row.attributedCents,
  }));
}

/**
 * Jour d'un horodatage, heure de Berlin, au format « 2026-07-26 ».
 *
 * Le format suédois est le seul que l'ICU rende déjà en ISO : il évite de
 * recomposer la date à la main et, surtout, d'utiliser `toISOString()` qui
 * renverrait le jour UTC — une ouverture à 1 h du matin en été tomberait la
 * veille sur la courbe.
 */
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(date);
}

function emptyPoint(day: string): CampaignStatsPoint {
  return { day, envoi: 0, ouverture: 0, clic: 0, commande: 0, desinscription: 0, echec: 0 };
}

/** Nombre maximal de jours rendus dans la série : au-delà, la courbe n'apporte plus rien. */
const MAX_SERIES_DAYS = 180;

export async function campaignStats(id: string): Promise<CampaignStats> {
  const [statuses, metrics, events] = await Promise.all([
    prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { _all: true },
    }),
    loadMetrics([id]),
    prisma.campaignEvent.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
      select: { kind: true, createdAt: true },
    }),
  ]);

  const counts = new Map(statuses.map((row) => [toRecipientStatus(row.status), row._count._all]));
  const measured = metrics.get(id) ?? EMPTY_METRICS;

  const recipientCount = statuses.reduce((sum, row) => sum + row._count._all, 0);
  const sentCount = measured.sentCount;

  // Les jours sans événement doivent exister dans la série, sinon la courbe
  // relie deux points distants comme s'il ne s'était rien passé entre eux.
  const points = new Map<string, CampaignStatsPoint>();
  for (const event of events) {
    const key = dayKey(event.createdAt);
    const point = points.get(key) ?? emptyPoint(key);
    switch (event.kind as CampaignEventKind) {
      case "envoi":
        point.envoi += 1;
        break;
      case "ouverture":
        point.ouverture += 1;
        break;
      case "clic":
        point.clic += 1;
        break;
      case "commande":
        point.commande += 1;
        break;
      case "desinscription":
        point.desinscription += 1;
        break;
      case "echec":
        point.echec += 1;
        break;
    }
    points.set(key, point);
  }

  const series = fillGaps(points);

  return {
    recipientCount,
    pendingCount: counts.get("en_attente") ?? 0,
    sentCount,
    failedCount: counts.get("echec") ?? 0,
    ignoredCount: counts.get("ignore") ?? 0,
    openedCount: measured.openedCount,
    clickedCount: measured.clickedCount,
    unsubscribedCount: measured.unsubscribedCount,
    orderCount: measured.orderCount,
    revenueCents: measured.revenueCents,
    openRate: sentCount > 0 ? Math.round((measured.openedCount / sentCount) * 100) : 0,
    clickRate: sentCount > 0 ? Math.round((measured.clickedCount / sentCount) * 100) : 0,
    series,
  };
}

function fillGaps(points: Map<string, CampaignStatsPoint>): CampaignStatsPoint[] {
  const keys = [...points.keys()].sort();
  if (keys.length === 0) return [];

  const series: CampaignStatsPoint[] = [];
  const cursor = new Date(`${keys[0]}T12:00:00Z`);
  const last = new Date(`${keys[keys.length - 1]}T12:00:00Z`);

  // Midi plutôt que minuit : ajouter 24 h à midi traverse sans dommage les
  // changements d'heure, ce qui n'est pas le cas à minuit.
  while (cursor.getTime() <= last.getTime() && series.length < MAX_SERIES_DAYS) {
    const key = cursor.toISOString().slice(0, 10);
    series.push(points.get(key) ?? emptyPoint(key));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return series;
}

/**
 * Journalise un événement. Le motif est tronqué : un message d'erreur de
 * fournisseur peut faire plusieurs kilo-octets, et la base n'a pas à les garder.
 */
export async function recordEvent(
  campaignId: string,
  kind: CampaignEventKind,
  recipientId: string | null,
  note?: string,
): Promise<void> {
  await prisma.campaignEvent.create({
    data: {
      campaignId,
      recipientId,
      kind,
      note: (note ?? "").slice(0, 300),
    },
  });
}
