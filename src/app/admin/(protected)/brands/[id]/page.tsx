import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapacitePage } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { BrandForm } from "@/components/admin/BrandForm";

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapacitePage("catalogue");

  const { id } = await params;
  const row = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!row) notFound();

  return (
    <div>
      <Link href="/admin/brands" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Modifier la marque</h1>
      <BrandForm
        mode="edit"
        initialData={{
          id: row.id,
          slug: row.slug,
          name: row.name,
          nameEn: row.nameEn,
          description: row.description,
          descriptionEn: row.descriptionEn,
          logo: row.logo,
          position: row.position,
          active: row.active,
          productCount: row._count.products,
        }}
      />
    </div>
  );
}
