import { prisma } from "@/server/prisma";
import { parseTags } from "@/lib/kk/tags";

export type ProductTagRow = {
  id: string;
  brand: string;
  name: string;
  category: string;
  group: string;
  tagsText: string;
};

function splitTags(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean),
    ),
  ];
}

/** Produits actifs, groupés par univers/catégorie, avec leurs tags en texte. */
export async function getProductsForTagging(): Promise<ProductTagRow[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    include: { category: { include: { group: true } } },
    orderBy: [{ category: { group: { position: "asc" } } }, { category: { position: "asc" } }, { name: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: p.category.label,
    group: p.category.group.label,
    tagsText: parseTags(p.tags).join(", "),
  }));
}

/** Enregistre les tags de plusieurs produits (normalisés et dédupliqués). */
export async function saveProductTags(items: { id: string; tagsText: string }[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.id) continue;
      await tx.product.update({
        where: { id: item.id },
        data: { tags: JSON.stringify(splitTags(item.tagsText ?? "")) },
      });
    }
  });
}
