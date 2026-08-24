import { prisma } from "@/server/prisma";
async function main() {
  const p = await prisma.product.findMany({ where: { active: true, NOT: { image: null } }, select: { name: true, brand: true, image: true }, take: 4 });
  for (const x of p) console.log(`${x.brand} — ${x.name}\n   ${x.image}`);
}
main().finally(() => prisma.$disconnect());
