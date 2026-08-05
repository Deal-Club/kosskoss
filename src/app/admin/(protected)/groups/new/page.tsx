import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { GroupForm } from "@/components/admin/GroupForm";

export default async function NewGroupPage() {
  await requireAdminSession();

  return (
    <div>
      <Link href="/admin/groups" className="text-sm font-semibold text-primary hover:underline">
        ← Retour à la liste
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-black text-foreground">Nouvel univers produits</h1>
      <GroupForm mode="new" />
    </div>
  );
}
