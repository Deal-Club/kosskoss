import { NextResponse } from "next/server";
import { getCartSuggestions } from "@/server/kk/suggestions";

/**
 * Suggestions du tiroir du panier.
 *
 * Appelée à l'ouverture du tiroir, avec le contenu du panier. Une requête à ce
 * moment-là plutôt que des suggestions passées par le gabarit : elles dépendent
 * de ce que contient le panier, et charger cette donnée sur chaque page du site
 * pour un tiroir que la plupart des visiteurs n'ouvriront pas serait payer très
 * cher un affichage secondaire.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.productIds)
    ? (body.productIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  try {
    return NextResponse.json({ items: await getCartSuggestions(ids) });
  } catch (error) {
    // Le tiroir doit rester utilisable : sans suggestions, il montre le panier
    // et ses boutons, ce qui est l'essentiel.
    console.error("[suggestions] Lecture impossible :", error);
    return NextResponse.json({ items: [] });
  }
}
