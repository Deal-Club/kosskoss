/**
 * Lectures complémentaires du back-office des campagnes.
 *
 * src/server/campaigns.ts couvre déjà tout le cycle de vie. Il manque trois
 * choses à l'interface d'administration, réunies ici plutôt qu'ajoutées là-bas
 * pour ne pas alourdir un module dont dépend le répartiteur d'envoi :
 *
 *  1. le catalogue tel que l'assistant doit le montrer — prix en centimes, et
 *     surtout la campagne concurrente déjà posée sur l'article ;
 *  2. les commandes attribuées à une campagne, pour son tableau de bord ;
 *  3. le nombre de campagnes en cours d'envoi, affiché dans le menu.
 *
 * Aucun calcul de remise ici : ce fichier ne fait que lire.
 */

import { prisma } from "@/server/prisma";
import {
  CAMPAIGN_STATUS_LABELS,
  isCampaignStatus,
  statusAppliesDiscount,
} from "@/lib/campaigns";
import {
  isOrderStatus,
  isPaymentStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orderStatus";

/**
 * Statuts qui posent réellement une remise sur le catalogue, dérivés de
 * `statusAppliesDiscount()` plutôt que recopiés — même règle que dans
 * src/server/promotions.ts, une seule liste à maintenir.
 */
const DISCOUNTING_STATUSES: readonly string[] = Object.keys(CAMPAIGN_STATUS_LABELS)
  .filter(isCampaignStatus)
  .filter(statusAppliesDiscount);

/** Campagne active qui porte déjà un produit donné. */
export interface ProductCampaignConflict {
  id: string;
  code: string;
  name: string;
  endsAt: Date;
}

export interface CampaignProductOption {
  id: string;
  brand: string;
  name: string;
  /** Visuel du produit, ou celui de sa catégorie en repli — règle du catalogue. */
  image: string;
  /** Identifiant public « groupe/slug », celui qu'emploient les filtres du back-office. */
  categoryId: string;
  categoryLabel: string;
  priceCents: number;
  stock: number;
  /**
   * Renseigné quand une autre campagne active remise déjà cet article. Deux
   * campagnes sur un même produit ne cassent rien — c'est la meilleure remise
   * qui s'applique — mais l'administrateur doit le savoir avant d'envoyer un
   * message qui annonce l'autre prix.
   */
  conflict: ProductCampaignConflict | null;
}

/**
 * Catalogue proposé à l'étape « produits » de l'assistant.
 *
 * Les articles retirés du catalogue sont écartés d'emblée : `createCampaign()`
 * les refuse de toute façon, autant ne pas les montrer. Deux requêtes, quel que
 * soit le nombre de produits.
 */
export async function listCampaignProductOptions(): Promise<CampaignProductOption[]> {
  const now = new Date();

  const [products, engaged] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: {
        id: true,
        brand: true,
        name: true,
        image: true,
        priceCents: true,
        stock: true,
        category: {
          select: {
            slug: true,
            label: true,
            image: true,
            group: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.campaignProduct.findMany({
      where: {
        campaign: { status: { in: [...DISCOUNTING_STATUSES] }, endsAt: { gt: now } },
      },
      select: {
        productId: true,
        campaign: { select: { id: true, code: true, name: true, endsAt: true } },
      },
    }),
  ]);

  // La campagne qui se termine le plus tôt est retenue : c'est celle dont la
  // fin libère l'article, l'information utile quand on planifie la suivante.
  const conflicts = new Map<string, ProductCampaignConflict>();
  for (const row of engaged) {
    const current = conflicts.get(row.productId);
    if (current && current.endsAt.getTime() <= row.campaign.endsAt.getTime()) continue;
    conflicts.set(row.productId, row.campaign);
  }

  return products.map((product) => ({
    id: product.id,
    brand: product.brand,
    name: product.name,
    image: product.image || product.category.image,
    categoryId: `${product.category.group.slug}/${product.category.slug}`,
    categoryLabel: product.category.label,
    priceCents: product.priceCents,
    stock: product.stock,
    conflict: conflicts.get(product.id) ?? null,
  }));
}

export interface CampaignOrderView {
  id: string;
  orderNumber: string;
  createdAt: Date;
  email: string;
  customerName: string;
  totalCents: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** La commande a-t-elle bénéficié de la livraison offerte de la campagne ? */
  freeShipping: boolean;
}

/**
 * Commandes attribuées à une campagne, la plus récente d'abord.
 *
 * L'attribution est posée à la commande par le tunnel d'achat : rien n'est
 * recalculé ici, on relit simplement `campaignId`.
 */
export async function listCampaignOrders(campaignId: string): Promise<CampaignOrderView[]> {
  const rows = await prisma.order.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      email: true,
      billingFirstName: true,
      billingLastName: true,
      totalCents: true,
      status: true,
      paymentStatus: true,
      campaignFreeShipping: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    createdAt: row.createdAt,
    email: row.email,
    customerName: `${row.billingFirstName} ${row.billingLastName}`.trim(),
    totalCents: row.totalCents,
    // Les statuts sont stockés en texte libre : une valeur inconnue ne peut
    // venir que d'une base modifiée à la main, on retombe sur l'état d'entrée
    // plutôt que de faire tomber la page.
    status: isOrderStatus(row.status) ? row.status : "eingegangen",
    paymentStatus: isPaymentStatus(row.paymentStatus) ? row.paymentStatus : "offen",
    freeShipping: row.campaignFreeShipping,
  }));
}

/** Nombre de campagnes dont l'envoi est en route — pastille du menu. */
export async function countRunningCampaigns(): Promise<number> {
  return prisma.campaign.count({ where: { status: "en_cours" } });
}
