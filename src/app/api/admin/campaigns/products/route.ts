import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { listCampaignProductOptions } from "@/server/campaignAdmin";

/**
 * Catalogue de l'étape « produits », prix en centimes et conflits de campagne
 * compris.
 *
 * L'assistant reçoit déjà cette liste en propriété au premier rendu ; la route
 * sert au rechargement après création d'un produit dans le panneau latéral. Le
 * produit tout juste créé doit apparaître et être coché sans quitter
 * l'assistant, et son prix doit venir du serveur — le formulaire produit, lui,
 * manipule des chaînes formatées.
 */
export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const products = await listCampaignProductOptions();
  return NextResponse.json(products);
}
