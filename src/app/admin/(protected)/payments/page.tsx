import { requireAdminSession } from "@/lib/dal";
import { listPaymentMethods } from "@/server/payments";
import { getBankTransferSettings } from "@/server/bankTransfer";
import { getGatewayAdminState } from "@/server/gateways/admin";
import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import { PaymentMethodTable } from "@/components/admin/PaymentMethodTable";
import { BankTransferForm } from "@/components/admin/BankTransferForm";
import { GatewaySettingsForm } from "@/components/admin/GatewaySettingsForm";

export default async function AdminPaymentsPage() {
  await requireAdminSession();
  const methods = await listPaymentMethods();
  const bankTransfer = await getBankTransferSettings();
  const gatewayState = await getGatewayAdminState();
  const activeCount = methods.filter((method) => method.enabled).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Moyens de paiement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCount} moyen{activeCount > 1 ? "s" : ""} de paiement sur {methods.length} visible
          {activeCount > 1 ? "s" : ""} dans la boutique. L&apos;ordre détermine l&apos;affichage au
          moment du paiement et dans le pied de page.
        </p>
      </div>

      <PaymentMethodTable methods={methods} />

      <div className="mt-10">
        <h2 className="mb-1 text-lg font-black text-foreground">Paiement en ligne (carte bancaire)</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Activez un prestataire pour encaisser les cartes automatiquement, saisissez ses clés
          secrètes, et choisissez quels moyens de paiement passent par lui. Le webhook du prestataire
          doit pointer vers <span className="font-mono">/api/payments/webhook/&lt;prestataire&gt;</span>.
        </p>
        <GatewaySettingsForm state={gatewayState} methods={methods} />
      </div>

      <div className="mt-10">
        <h2 className="mb-1 text-lg font-black text-foreground">Coordonnées du virement bancaire</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Ces coordonnées et instructions s&apos;affichent sur la page de confirmation et dans
          l&apos;e-mail envoyé au client, pour les commandes réglées par virement.
        </p>
        <BankTransferForm initial={bankTransfer} />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-black text-foreground">Nouveau moyen de paiement</h2>
        <PaymentMethodForm mode="new" />
      </div>
    </div>
  );
}
