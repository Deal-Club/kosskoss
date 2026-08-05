import { prisma } from "@/server/prisma";
import type { KKProductView, KKTone, KKBadge } from "@/types/kk";

// Rotation de teintes pour varier les visuels produit sans photo.
const TONES: KKTone[] = ["clay", "sand", "teal", "rose"];

function toBadge(value: string | null): KKBadge {
  return value === "bestseller" || value === "nouveau" ? value : null;
}

/**
 * Produits mis en avant sur l'accueil, lus en base.
 * Montants : le champ historique `priceCents` porte désormais un entier de
 * FCFA (pas de sous-unité) — voir docs/13, chantier « fondation FCFA ».
 * Renvoie une liste vide sans erreur si le catalogue est vide.
 */
export async function getHomeProducts(limit = 8): Promise<KKProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { category: { include: { group: true } } },
  });

  return rows.map((p, index) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    priceFcfa: p.priceCents,
    oldPriceFcfa: p.oldPriceCents ?? undefined,
    badge: toBadge(p.badge),
    tone: TONES[index % TONES.length],
    image: p.image,
    href: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
  }));
}
