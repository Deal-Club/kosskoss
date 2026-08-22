/**
 * Page d'action publique d'une campagne.
 *
 * Elle n'existe que pour les campagnes portant plusieurs produits : avec un
 * seul article, le lien du message mène directement à sa fiche, ce qui épargne
 * une page au client.
 *
 * Ce module est volontairement séparé de src/server/campaigns.ts, qui sert le
 * back-office : ici rien ne doit fuir en dehors de ce qu'un visiteur a le droit
 * de voir. Pas de destinataires, pas de statistiques, pas de cadence d'envoi.
 */

import { prisma } from "@/server/prisma";
import { getStorefrontProducts } from "@/server/store";
import { pickText } from "@/server/localizedContent";
import {
  campaignTypeDefinition,
  isCampaignType,
  isCampaignStatus,
  renderTemplate,
  statusAppliesDiscount,
  type CampaignType,
  type DiscountKind,
} from "@/lib/campaigns";
import type { Product } from "@/types/home";

export interface CampaignLanding {
  code: string;
  name: string;
  type: CampaignType;
  discountKind: DiscountKind;
  discountValue: number;
  endsAt: Date;
  /** Un compte à rebours doit-il être mis en avant ? (vente flash) */
  showsCountdown: boolean;
  /**
   * Titre repris du message, variables déjà remplacées.
   *
   * Le corps du message n'est délibérément pas repris : il est rédigé comme une
   * lettre (« Bonjour Anne, … »), ce qui n'a aucun sens sur une page publique où
   * personne n'est nommé. Le titre, lui, décrit l'offre et se suffit à lui-même.
   */
  headline: string;
  products: Product[];
}

/**
 * Charge la page d'action, ou rien du tout.
 *
 * Une campagne terminée ne rend pas sa page : elle afficherait des prix qui ne
 * sont plus appliqués au panier, ce qui est la définition d'une publicité
 * trompeuse. Les visiteurs qui reviennent par un vieux lien tombent donc sur
 * une page introuvable — le catalogue reste accessible par la navigation.
 */
export async function getCampaignLanding(
  slug: string,
  locale: string,
): Promise<CampaignLanding | undefined> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;

  const row = await prisma.campaign.findFirst({
    where: { landingSlug: normalized },
    select: {
      code: true,
      name: true,
      type: true,
      status: true,
      discountKind: true,
      discountValue: true,
      startsAt: true,
      endsAt: true,
      headline: true,
      bodyText: true,
      headlineEn: true,
      bodyTextEn: true,
      products: { select: { productId: true } },
    },
  });

  if (!row) return undefined;

  const now = new Date();
  const live =
    isCampaignStatus(row.status) &&
    statusAppliesDiscount(row.status) &&
    row.startsAt <= now &&
    row.endsAt >= now;
  if (!live) return undefined;

  const type = isCampaignType(row.type) ? row.type : "promotion";
  // La traduction descend dans la lecture : `getStorefrontProducts` localise
  // son résultat, `lead.name`/`lead.brand` ci-dessous sont donc déjà dans la
  // bonne langue, sans repasser par un accès direct à un champ `*En` ici.
  const products = await getStorefrontProducts(row.products.map((entry) => entry.productId), locale);
  // Tous les produits retirés du catalogue depuis le lancement : la page n'a
  // plus rien à montrer.
  if (products.length === 0) return undefined;

  // Repli sur le français quand la traduction anglaise est vide, règle appliquée
  // partout dans la boutique — via `pickText`, jamais un accès direct au champ
  // `*En`.
  const english = locale === "en";
  const kind = row.discountKind as DiscountKind;
  const lead = products[0];

  return {
    code: row.code,
    name: row.name,
    type,
    discountKind: kind,
    discountValue: row.discountValue,
    endsAt: row.endsAt,
    showsCountdown: campaignTypeDefinition(type).showsCountdown,
    headline: renderTemplate(pickText(row.headline, english ? row.headlineEn : undefined), {
      produit: lead.name,
      marque: lead.brand,
      prix: lead.oldPrice ?? lead.price,
      prix_promo: lead.price,
      remise: discountLabel(kind, row.discountValue, english),
      fin: row.endsAt.toLocaleDateString(english ? "en-GB" : "fr-FR", {
        day: "numeric",
        month: "long",
      }),
      duree: remainingLabel(row.endsAt, now, english),
    }),
    products,
  };
}

/** « -20 % », « -99,80 € » ou la mention de livraison offerte. */
function discountLabel(kind: DiscountKind, value: number, english: boolean): string {
  switch (kind) {
    case "percent":
      return `-${Math.round(value)} %`;
    case "amount":
      // Format français dans les deux langues : les prix de la boutique le sont
      // partout, une page anglaise qui écrirait « 99.80 € » jurerait avec les
      // fiches produit juste en dessous.
      return `-${(value / 100).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} €`;
    case "free_shipping":
      return english ? "Free shipping" : "Livraison offerte";
    case "none":
      return "";
  }
}

/**
 * « 48 heures », « 3 jours ». Le décompte à la seconde est l'affaire du compte
 * à rebours.
 *
 * Corrigé au passage : ce résidu de l'allemand du site d'origine (« Stunden »,
 * « Tage ») s'affichait encore sur la boutique française — l'allemand a été
 * entièrement retiré du projet (voir TARGET.md), cette fonction l'avait
 * oublié.
 */
function remainingLabel(endsAt: Date, now: Date, english: boolean): string {
  const hours = Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 3_600_000));
  if (hours < 48) {
    return english ? `${hours} hours` : `${hours} heures`;
  }
  const days = Math.ceil(hours / 24);
  return english ? `${days} days` : `${days} jours`;
}
