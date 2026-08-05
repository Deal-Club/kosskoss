/**
 * Avantages accordés au visiteur par la campagne dont il vient.
 *
 * Le panier est rendu dans le navigateur : il ne peut pas interroger la base.
 * Il pourrait lire le cookie tout seul, mais celui-ci ne contient qu'un jeton,
 * et surtout un cookie se modifie à la main — laisser le navigateur décider
 * seul de la gratuité du port reviendrait à laisser le client fixer son prix.
 *
 * Cette route est donc la seule autorité sur ce que la campagne accorde.
 * L'affichage du panier s'y réfère, et le tunnel de commande refait le même
 * contrôle côté serveur : un affichage trafiqué ne change rien à la facture.
 */

import { NextResponse } from "next/server";
import { resolveCampaignContext } from "@/server/campaignContext";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await resolveCampaignContext();

  const body = context
    ? {
        active: context.active,
        freeShipping: context.freeShipping,
        campaignCode: context.campaignCode,
        campaignName: context.campaignName,
      }
    : { active: false, freeShipping: false, campaignCode: null, campaignName: null };

  return NextResponse.json(body, {
    // Une réponse propre à un visiteur n'a rien à faire dans un cache partagé.
    headers: { "Cache-Control": "no-store" },
  });
}
