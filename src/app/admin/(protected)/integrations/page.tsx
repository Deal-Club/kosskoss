import { requireAdminSession } from "@/lib/dal";
import { listIntegrations } from "@/server/integrations";
import { IntegrationCreateForm, IntegrationForm } from "@/components/admin/IntegrationForm";

export default async function AdminIntegrationsPage() {
  await requireAdminSession();
  const integrations = await listIntegrations();
  const configuredCount = integrations.filter((integration) => integration.configured).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Intégrations &amp; clés API</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {configuredCount} accès sur {integrations.length} sont renseignés. Toutes les clés sont
          stockées chiffrées et ne sont jamais réaffichées en clair.
        </p>
      </div>

      <div className="grid gap-4">
        {integrations.map((integration) => (
          <IntegrationForm key={integration.key} integration={integration} />
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-black text-foreground">
          Ajouter une intégration personnalisée
        </h2>
        <IntegrationCreateForm />
      </div>
    </div>
  );
}
