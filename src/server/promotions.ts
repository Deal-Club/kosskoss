/**
 * Moteur de promotions des campagnes marketing.
 *
 * Le prix des produits n'est jamais réécrit en base. Une campagne pose une
 * période et une remise ; ce module en déduit, à chaque affichage, ce que le
 * client voit et ce qu'il paiera. Passé `endsAt`, plus aucune ligne ne
 * ressort d'ici et le catalogue reprend son prix de base sans qu'aucune tâche
 * de fond n'ait eu à intervenir — c'est tout l'intérêt d'un calcul à la lecture.
 *
 * Tous les calculs monétaires viennent de src/lib/campaigns.ts. Aucune remise
 * n'est recalculée ici : l'aperçu du back-office, le message envoyé, la fiche
 * produit et la facture partagent la même arithmétique, donc ne peuvent pas
 * diverger.
 */

import { prisma } from "@/server/prisma";
import {
  CAMPAIGN_STATUS_LABELS,
  campaignTypeDefinition,
  discountedPriceCents,
  effectivePercent,
  isCampaignStatus,
  isCampaignType,
  savingCents,
  statusAppliesDiscount,
  type CampaignType,
  type DiscountKind,
} from "@/lib/campaigns";

// ---- Constantes ----

/** Pastille de la livraison offerte. Allemand : c'est la langue de la boutique. */
const FREE_SHIPPING_BADGE = "Versandkostenfrei";

const DISCOUNT_KINDS: readonly DiscountKind[] = ["percent", "amount", "free_shipping", "none"];

/**
 * Statuts qui appliquent réellement la remise, dérivés de
 * `statusAppliesDiscount()` plutôt que recopiés. Le filtre SQL ci-dessous et le
 * contrôle en mémoire lisent ainsi la même règle : ajouter un statut à
 * src/lib/campaigns.ts suffit, il n'y a pas de seconde liste à penser à mettre
 * à jour.
 */
const DISCOUNTING_STATUSES: readonly string[] = Object.keys(CAMPAIGN_STATUS_LABELS)
  .filter(isCampaignStatus)
  .filter(statusAppliesDiscount);

// ---- Types publics ----

export interface ProductPromotion {
  campaignId: string;
  campaignCode: string;
  campaignType: CampaignType;
  discountKind: DiscountKind;
  discountValue: number;
  /** Prix de référence figé, celui qui s'affiche barré. */
  basePriceCents: number;
  /** Prix effectivement payé. */
  priceCents: number;
  savingCents: number;
  /** Pourcentage arrondi, pour la pastille : 20 -> « -20 % ». */
  percent: number;
  /** Texte de la pastille produit, ex. « -20 % ». */
  badge: string;
  /** Début de l'offre, exigé par Google pour dater un prix promotionnel. */
  startsAt: Date;
  endsAt: Date;
  showsCountdown: boolean;
  freeShipping: boolean;
}

// ---- Lecture en base ----

/**
 * Forme minimale lue en base. Le prix courant du produit est joint : il sert à
 * vérifier que la campagne profite bien au client (voir `toPromotion`).
 */
interface CampaignProductRow {
  productId: string;
  basePriceCents: number;
  product: { priceCents: number };
  campaign: {
    id: string;
    code: string;
    type: string;
    status: string;
    discountKind: string;
    discountValue: number;
    startsAt: Date;
    endsAt: Date;
  };
}

const campaignProductSelect = {
  productId: true,
  basePriceCents: true,
  product: { select: { priceCents: true } },
  campaign: {
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      startsAt: true,
      discountKind: true,
      discountValue: true,
      endsAt: true,
    },
  },
} as const;

/** Un `discountKind` inconnu ne peut venir que d'une base modifiée à la main. */
function toDiscountKind(value: string): DiscountKind {
  return (DISCOUNT_KINDS as readonly string[]).includes(value) ? (value as DiscountKind) : "none";
}

/**
 * Traduit une ligne de campagne en promotion affichable, ou rien du tout.
 *
 * Deux refus possibles, tous deux volontaires :
 *  - le statut ou la nature de la remise ne l'autorisent pas ;
 *  - la campagne ne fait pas gagner un centime au client. Le prix de référence
 *    est figé à l'entrée du produit dans la campagne : si le catalogue a baissé
 *    depuis, la « remise » calculée sur l'ancien prix serait supérieure au prix
 *    du jour. Afficher un prix plus élevé au nom d'une promotion serait absurde
 *    pour le client et intenable vis-à-vis de la Preisangabenverordnung. La
 *    livraison offerte échappe à ce contrôle : elle ne touche pas au prix de
 *    l'article mais reste un avantage réel.
 */
function toPromotion(row: CampaignProductRow): ProductPromotion | undefined {
  const { campaign } = row;

  if (!isCampaignStatus(campaign.status) || !statusAppliesDiscount(campaign.status)) return undefined;

  const discountKind = toDiscountKind(campaign.discountKind);
  if (discountKind === "none") return undefined;

  const basePriceCents = row.basePriceCents;
  const priceCents = discountedPriceCents(basePriceCents, discountKind, campaign.discountValue);
  const saving = savingCents(basePriceCents, discountKind, campaign.discountValue);
  const freeShipping = discountKind === "free_shipping";

  if (!freeShipping && priceCents >= row.product.priceCents) return undefined;

  const percent = effectivePercent(basePriceCents, discountKind, campaign.discountValue);

  return {
    campaignId: campaign.id,
    campaignCode: campaign.code,
    // Un type inconnu retomberait de toute façon sur « promotion » côté
    // gabarits ; on garde la même tolérance ici pour ne pas casser une page.
    campaignType: isCampaignType(campaign.type) ? campaign.type : "promotion",
    discountKind,
    discountValue: campaign.discountValue,
    basePriceCents,
    priceCents,
    savingCents: saving,
    percent,
    // Une remise en euros s'annonce en pourcentage — c'est ce qui parle au
    // client dans une grille de produits. Le plancher à 1 % évite la pastille
    // « -0 % » d'une remise symbolique sur un article cher.
    badge: freeShipping ? FREE_SHIPPING_BADGE : `-${Math.max(1, percent)} %`,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    showsCountdown: campaignTypeDefinition(isCampaignType(campaign.type) ? campaign.type : "promotion")
      .showsCountdown,
    freeShipping,
  };
}

/**
 * Départage deux campagnes actives visant le même produit.
 *
 * C'est l'économie la plus forte qui gagne, pas la plus récente ni la mieux
 * remplie : le client qui a reçu deux messages ne doit jamais découvrir qu'il
 * aurait mieux fait de cliquer sur l'autre. À économie égale — le cas d'une
 * livraison offerte face à une autre livraison offerte — c'est l'offre qui se
 * termine le plus tôt qui l'emporte, puis l'identifiant, pour que deux rendus
 * successifs de la même page affichent toujours la même chose.
 */
function outranks(candidate: ProductPromotion, current: ProductPromotion): boolean {
  if (candidate.savingCents !== current.savingCents) {
    return candidate.savingCents > current.savingCents;
  }
  if (candidate.endsAt.getTime() !== current.endsAt.getTime()) {
    return candidate.endsAt.getTime() < current.endsAt.getTime();
  }
  return candidate.campaignId < current.campaignId;
}

// ---- API publique ----

/**
 * Promotions actives, indexées par productId. Sans argument : toutes.
 *
 * Une seule requête, quel que soit le nombre de produits : les pages de
 * catégorie et la page d'accueil demandent des dizaines d'articles à la fois,
 * un aller-retour par produit s'y verrait immédiatement.
 */
export async function getActivePromotions(
  productIds?: readonly string[],
): Promise<Map<string, ProductPromotion>> {
  // Une liste vide n'est pas « aucun filtre » : c'est explicitement rien.
  if (productIds && productIds.length === 0) return new Map();

  const now = new Date();

  const rows: CampaignProductRow[] = await prisma.campaignProduct.findMany({
    where: {
      ...(productIds ? { productId: { in: [...productIds] } } : {}),
      campaign: {
        status: { in: [...DISCOUNTING_STATUSES] },
        startsAt: { lte: now },
        endsAt: { gte: now },
        discountKind: { not: "none" },
      },
    },
    select: campaignProductSelect,
  });

  const best = new Map<string, ProductPromotion>();
  for (const row of rows) {
    const promotion = toPromotion(row);
    if (!promotion) continue;

    const current = best.get(row.productId);
    if (!current || outranks(promotion, current)) best.set(row.productId, promotion);
  }

  return best;
}

export async function getActivePromotionForProduct(
  productId: string,
): Promise<ProductPromotion | undefined> {
  const promotions = await getActivePromotions([productId]);
  return promotions.get(productId);
}

/**
 * Le prix qui doit être facturé pour ce produit maintenant.
 *
 * `basePriceCents` est le prix catalogue relu en base par l'appelant, jamais
 * celui annoncé par le navigateur. Le minimum des deux est retenu : le prix de
 * référence de la campagne est figé, et une campagne ne doit en aucun cas
 * servir à facturer plus cher que le catalogue du jour — c'est notamment le cas
 * d'une campagne « livraison offerte », qui ne touche pas au prix de l'article
 * et dont le prix figé peut avoir été dépassé par une baisse de tarif.
 */
export async function priceForOrder(
  productId: string,
  basePriceCents: number,
): Promise<{ priceCents: number; campaignId: string | null }> {
  const promotion = await getActivePromotionForProduct(productId);
  if (!promotion) return { priceCents: basePriceCents, campaignId: null };

  return {
    priceCents: Math.min(basePriceCents, promotion.priceCents),
    campaignId: promotion.campaignId,
  };
}

/**
 * La campagne visée accorde-t-elle la livraison offerte, et est-elle active ?
 *
 * Appelée à la commande avec l'identifiant porté par le cookie d'attribution :
 * le cookie est lisible et modifiable par le visiteur, l'avantage se revalide
 * donc intégralement ici, période comprise. Un cookie encore présent après la
 * fin de la campagne ne donne rien.
 */
export async function campaignGrantsFreeShipping(campaignId: string): Promise<boolean> {
  if (!campaignId) return false;

  const now = new Date();
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      status: { in: [...DISCOUNTING_STATUSES] },
      startsAt: { lte: now },
      endsAt: { gte: now },
      discountKind: "free_shipping",
    },
    select: { status: true },
  });

  if (!campaign) return false;
  return isCampaignStatus(campaign.status) && statusAppliesDiscount(campaign.status);
}
