import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { GroupForm } from "@/components/admin/GroupForm";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { categories: true } } },
  });
  if (!group) notFound();

  return (
    <div>
      <Link href="/admin/groups" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">
        Modifier l&apos;univers produits
      </h1>
      <GroupForm
        mode="edit"
        initialData={{
          id: group.id,
          slug: group.slug,
          label: group.label,
          position: group.position,
          categoryCount: group._count.categories,
        }}
      />
    </div>
  );
}
