import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getActivePromotions } from "@/server/promotions";
import { MAX_CART_LINES } from "@/lib/cart";
import type { CartLine } from "@/lib/cart";
import { discountedVariantCents } from "@/lib/variantPricing";

// Revalidation du panier.
//
// Le panier vit dans le localStorage du visiteur : son contenu peut dater de
// plusieurs semaines. Avant de l'afficher, la boutique redemande ici les prix,
// les libellés et les stocks réels. Sans cela un prix périmé serait affiché,
// ce que la Preisangabenverordnung interdit.
//
// Les promotions de campagne suivent la même règle que le reste du prix : c'est
// ici qu'un article ajouté avant le début d'une campagne prend son prix remisé,
// et qu'un article ajouté pendant reprend son prix de base une fois la campagne
// terminée. Le montant renvoyé est celui que src/server/orders.ts facturera.
//
// VARIANT-AWARE : chaque ligne du panier est identifiée par (productId, variantId).
// Deux volumes d'un même produit restent deux lignes distinctes ; ouvrir le
// panier ne les fusionne plus ni ne remplace le prix de la variation par le
// « à partir de » du produit.

interface RequestLine {
  productId: string;
  variantId?: string;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  // Accepte les deux formats :
  //  - nouveau : { lines: [{ productId, variantId? }] }
  //  - legacy  : { productIds: string[] }  (mapping vers lines sans variantId)
  let requestLines: RequestLine[];

  if (Array.isArray(payload?.lines)) {
    requestLines = (payload.lines as unknown[])
      .filter(
        (item): item is { productId: string; variantId?: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).productId === "string" &&
          ((item as Record<string, unknown>).variantId === undefined ||
            typeof (item as Record<string, unknown>).variantId === "string"),
      )
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
      }));
  } else if (Array.isArray(payload?.productIds)) {
    requestLines = (payload.productIds as unknown[])
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((productId) => ({ productId }));
  } else {
    requestLines = [];
  }

  // Respect du plafond
  requestLines = requestLines.slice(0, MAX_CART_LINES);

  if (requestLines.length === 0) {
    return NextResponse.json({ lines: [] });
  }

  const productIds = [...new Set(requestLines.map((l) => l.productId))];
  const variantIds = requestLines
    .map((l) => l.variantId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const [products, variants, promotions] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: {
        id: true,
        brand: true,
        name: true,
        slug: true,
        image: true,
        priceCents: true,
        stock: true,
        category: { select: { slug: true, image: true, group: { select: { slug: true } } } },
      },
    }),
    variantIds.length > 0
      ? prisma.productVariant.findMany({
          where: { id: { in: variantIds }, active: true },
          select: { id: true, productId: true, label: true, priceCents: true },
        })
      : Promise.resolve([]),
    getActivePromotions(productIds),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));

  // Une ligne de réponse par paire (productId, variantId) demandée.
  const lines: Omit<CartLine, "quantity">[] = [];

  for (const req of requestLines) {
    const product = productById.get(req.productId);
    if (!product) continue; // produit inactif ou inexistant → ligne omise

    const promotion = promotions.get(product.id);
    const path = `/${product.category.group.slug}/${product.category.slug}/${product.slug}`;
    const image = product.image || product.category.image;

    if (req.variantId) {
      // Ligne avec variation : le prix vient de la variation, pas du produit.
      const variant = variantById.get(req.variantId);
      // Variation inconnue, inactive ou n'appartenant pas au bon produit → omise.
      if (!variant || variant.productId !== product.id) continue;

      lines.push({
        productId: product.id,
        variantId: variant.id,
        variantLabel: variant.label,
        slug: product.slug,
        brand: product.brand,
        name: product.name,
        image,
        path,
        // Prix de la variation après remise campagne, calculé avec la même
        // formule que la vitrine et la facturation : display == charge.
        priceCents: discountedVariantCents(variant.priceCents, promotion),
        stock: product.stock,
      });
    } else {
      // Ligne sans variation : prix catalogue du produit, remisé si campagne.
      lines.push({
        productId: product.id,
        slug: product.slug,
        brand: product.brand,
        name: product.name,
        image,
        path,
        // Jamais au-dessus du prix catalogue : le prix de référence d'une campagne
        // est figé et peut avoir été dépassé par une baisse de tarif.
        priceCents: promotion
          ? Math.min(product.priceCents, promotion.priceCents)
          : product.priceCents,
        stock: product.stock,
      });
    }
  }

  return NextResponse.json({ lines });
}
