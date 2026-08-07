import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";
import {
  addFavorite,
  clearFavorites,
  listFavorites,
  mergeFavorites,
  removeFavorite,
} from "@/server/kk/favorites";

/**
 * Favoris du client connecté.
 *
 * La lecture répond 200 même sans session, avec `authenticated: false` : c'est
 * le cas le plus courant — un visiteur sur deux n'a pas de compte — et il n'a
 * rien d'anormal. Un 401 inscrirait une erreur rouge dans la console de chaque
 * visiteur et noierait les vraies. Les écritures, elles, répondent bien 401 :
 * là, l'absence de session empêche réellement l'opération.
 *
 * Protection CSRF : le cookie de session est `sameSite: lax`, qu'un POST venu
 * d'un autre site n'emporte pas. Aucun jeton supplémentaire n'est nécessaire.
 */

function readProductId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).productId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ ok: true, authenticated: false, items: [] });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    items: await listFavorites(customer.id),
  });
}

/**
 * Deux usages sur le même verbe :
 *   - `{ productId }` ajoute un produit ;
 *   - `{ productIds }` verse dans le compte la liste accumulée hors connexion.
 * Dans les deux cas la réponse porte la liste complète à jour, pour que le
 * navigateur se cale dessus sans second aller-retour.
 */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const payload: unknown = await request.json().catch(() => null);

  const list = (payload as { productIds?: unknown } | null)?.productIds;
  if (Array.isArray(list)) {
    await mergeFavorites(
      customer.id,
      list.filter((id): id is string => typeof id === "string"),
    );
    return NextResponse.json({ ok: true, items: await listFavorites(customer.id) });
  }

  const productId = readProductId(payload);
  if (!productId) return accountErrorResponse("invalid_payload", 400);

  // `false` = produit inconnu, retiré de la vente, ou plafond atteint. La liste
  // renvoyée reste la référence : le navigateur s'y aligne et le cœur retombe.
  const added = await addFavorite(customer.id, productId);
  return NextResponse.json(
    { ok: added, items: await listFavorites(customer.id) },
    { status: added ? 200 : 409 },
  );
}

/** `?productId=` retire un produit ; sans paramètre, la liste est vidée. */
export async function DELETE(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const productId = new URL(request.url).searchParams.get("productId");
  if (productId) await removeFavorite(customer.id, productId);
  else await clearFavorites(customer.id);

  return NextResponse.json({ ok: true, items: await listFavorites(customer.id) });
}
