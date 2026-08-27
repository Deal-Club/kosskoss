import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { validerCoupon } from "@/server/coupons";

/**
 * Vérifie un code promo pour le panier en cours et rend la remise applicable.
 *
 * Le sous-total n'est pas lu dans la requête : le navigateur enverrait le
 * montant qui l'arrange. Seules les lignes du panier arrivent ici, et leurs
 * prix sont relus en base — exactement comme le fait `createKossOrder`. Un
 * panier gonflé côté client ne peut donc pas débloquer un code réservé aux
 * grosses commandes.
 *
 * Cette route ne réserve ni ne consomme rien : le compteur d'usage n'est
 * incrémenté qu'à la commande effectivement validée.
 */

interface LigneRecue {
  productId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
}

/** Sous-total réel du panier, calculé sur les prix en base. */
async function sousTotalReel(lignes: LigneRecue[]): Promise<number> {
  const ids = [
    ...new Set(
      lignes
        .map((l) => (typeof l.productId === "string" ? l.productId : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) return 0;

  const produits = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    include: { variants: true },
  });
  const parId = new Map(produits.map((p) => [p.id, p]));

  let total = 0;
  for (const ligne of lignes) {
    const produit = typeof ligne.productId === "string" ? parId.get(ligne.productId) : undefined;
    if (!produit) continue;

    const quantite = Math.min(20, Math.max(1, Math.floor(Number(ligne.quantity) || 1)));
    const variante =
      typeof ligne.variantId === "string"
        ? produit.variants.find((v) => v.id === ligne.variantId && v.active)
        : undefined;

    total += (variante?.priceCents ?? produit.priceCents) * quantite;
  }
  return total;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json(
      { ok: false, message: "Requête invalide.", error: "requete_invalide" },
      { status: 400 },
    );

  const lignes = Array.isArray(body.items) ? (body.items as LigneRecue[]) : [];
  const subtotalCents = await sousTotalReel(lignes);

  if (subtotalCents <= 0) {
    return NextResponse.json(
      { ok: false, message: "Votre panier est vide.", error: "panier_vide" },
      { status: 400 },
    );
  }

  const resultat = await validerCoupon(body.code, subtotalCents);
  if (!resultat.ok) {
    // 200 et non 4xx : un code refusé est une réponse normale du formulaire,
    // pas une erreur de la requête. Le tunnel traduit `error` dans la langue
    // de la page (commande.couponErrors) ; `message` n'est qu'un repli.
    return NextResponse.json({ ok: false, message: resultat.message, error: resultat.error });
  }

  return NextResponse.json({
    ok: true,
    code: resultat.coupon.code,
    label: resultat.coupon.label,
    discountCents: resultat.coupon.discountCents,
    subtotalCents,
    totalCents: subtotalCents - resultat.coupon.discountCents,
  });
}
