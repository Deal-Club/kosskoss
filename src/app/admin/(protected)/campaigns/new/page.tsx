import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { listCampaignProductOptions } from "@/server/campaignAdmin";
import { listCategories } from "@/server/store";
import { CampaignWizard } from "@/components/admin/CampaignWizard";

export default async function NewCampaignPage() {
  const session = await requireAdminSession();

  // Le catalogue et les catégories partent ensemble : l'assistant a besoin du
  // premier pour la sélection, des secondes pour le formulaire produit du
  // panneau latéral.
  const [products, categories] = await Promise.all([
    listCampaignProductOptions(),
    listCategories(),
  ]);

  return (
    <div>
      <Link
        href="/admin/campaigns"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Toutes les campagnes
      </Link>

      <h1 className="mb-1 text-2xl font-black text-foreground">Nouvelle campagne</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Rien n&apos;est envoyé avant la confirmation de la dernière étape.
      </p>

      <CampaignWizard
        initialProducts={products}
        categories={categories}
        adminEmail={session.email}
      />
    </div>
  );
}
