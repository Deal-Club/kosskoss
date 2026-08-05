/**
 * Rattachement d'un visiteur à la campagne qui l'a amené.
 *
 * Le cookie ne contient que le jeton du destinataire. Il ne porte ni
 * l'identifiant de la campagne, ni le montant d'une remise, ni un drapeau
 * « livraison offerte » : tout cela se relit en base à partir du jeton. Un
 * cookie fabriqué à la main ne peut donc rien accorder qui n'existe pas.
 *
 * Le cookie n'est délibérément pas `httpOnly` : le panier, rendu côté
 * navigateur, doit pouvoir annoncer la livraison offerte avant la commande.
 * Cette lecture ne sert qu'à l'affichage — le montant réellement facturé est
 * recalculé côté serveur au moment de créer la commande, où le jeton est
 * revalidé. Rendre le cookie lisible n'ouvre donc aucun droit.
 *
 * Deux durées se superposent, et elles ne coïncident pas :
 *   - l'attribution vit tant que le cookie vit (trente jours). Un client qui
 *     clique aujourd'hui et commande dans trois semaines reste compté pour la
 *     campagne, même si l'offre est terminée depuis longtemps ;
 *   - la livraison offerte, elle, s'éteint avec la campagne. Accorder un
 *     avantage tarifaire après la date de fin annoncée serait une promesse que
 *     la boutique n'a pas faite.
 */

import { cookies } from "next/headers";
import { prisma } from "@/server/prisma";
import {
  ATTRIBUTION_WINDOW_DAYS,
  CAMPAIGN_COOKIE,
  isCampaignStatus,
  statusAppliesDiscount,
} from "@/lib/campaigns";

export interface CampaignContext {
  campaignId: string;
  campaignCode: string;
  campaignName: string;
  recipientId: string;
  /** La campagne est-elle encore en cours ? */
  active: boolean;
  /** Livraison offerte accordée, et encore valable maintenant. */
  freeShipping: boolean;
}

const COOKIE_MAX_AGE_SECONDS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60;

/**
 * `sameSite: "lax"` est indispensable : le visiteur arrive depuis un client de
 * messagerie, donc depuis un autre site. En « strict », le cookie ne serait pas
 * renvoyé à la première navigation et l'attribution serait perdue au moment
 * précis où elle compte.
 */
export function campaignCookieOptions() {
  return {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  };
}

/**
 * Le jeton fait 32 octets encodés en hexadécimal. Le filtrer avant d'interroger
 * la base évite qu'une valeur de cookie fantaisiste parte en requête à chaque
 * page vue.
 */
function looksLikeToken(value: string): boolean {
  return /^[0-9a-f]{32,128}$/i.test(value);
}

export async function resolveCampaignContextFromToken(
  token: string | null | undefined,
): Promise<CampaignContext | null> {
  if (!token || !looksLikeToken(token)) return null;

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { token },
    select: {
      id: true,
      campaign: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          discountKind: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });

  if (!recipient) return null;

  const campaign = recipient.campaign;
  const now = new Date();
  const active =
    isCampaignStatus(campaign.status) &&
    statusAppliesDiscount(campaign.status) &&
    campaign.startsAt <= now &&
    campaign.endsAt >= now;

  return {
    campaignId: campaign.id,
    campaignCode: campaign.code,
    campaignName: campaign.name,
    recipientId: recipient.id,
    active,
    freeShipping: active && campaign.discountKind === "free_shipping",
  };
}

/** Contexte du visiteur courant, lu dans son cookie. */
export async function resolveCampaignContext(): Promise<CampaignContext | null> {
  const store = await cookies();
  return resolveCampaignContextFromToken(store.get(CAMPAIGN_COOKIE)?.value);
}
