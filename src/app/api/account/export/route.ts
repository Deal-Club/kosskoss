import { NextResponse } from "next/server";
import { exportCustomerData } from "@/server/customers";
import { getCurrentCustomer } from "@/server/customerSession";
import { accountErrorResponse } from "@/server/accountMessages";

/**
 * Droit d'accès (art. 15 RGPD) et droit à la portabilité (art. 20 RGPD).
 *
 * Le fichier est du JSON : format structuré, couramment utilisé et lisible par
 * machine, ce que l'art. 20 § 1 exige. Il est servi en pièce jointe pour que le
 * navigateur l'enregistre au lieu de l'afficher.
 *
 * Le mot de passe n'y figure pas, même haché — un export n'a aucune raison de
 * transporter un secret d'authentification.
 */
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return accountErrorResponse("invalid_credentials", 401);

  const data = await exportCustomerData(customer.id);
  if (!data) return accountErrorResponse("not_found", 404);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `hausgeraete-pfeffer-datenauskunft-${stamp}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Une copie de données personnelles n'a rien à faire dans un cache.
      "Cache-Control": "no-store",
    },
  });
}
