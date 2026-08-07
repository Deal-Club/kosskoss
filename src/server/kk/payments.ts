import { cache } from "react";
import { prisma } from "@/server/prisma";

/**
 * Moyens de paiement proposés au tunnel de commande.
 *
 * Ils étaient jusqu'ici écrits en dur dans le formulaire — trois entrées, alors
 * que le back-office en gère quatre. Le paiement à la livraison, activé en base
 * et déterminant sur ce marché, n'était donc jamais proposé au client, et
 * désactiver une option depuis l'administration n'avait aucun effet sur la
 * boutique. La liste est désormais lue en base, et le serveur revalide la clé
 * reçue contre cette même liste au moment de créer la commande.
 */

export interface PaymentMethodView {
  key: string;
  label: string;
  description: string;
  /** Sigle court affiché sur la vignette (OM, MTN, VISA…). */
  badge: string;
}

/** Sigles d'affichage. Une clé inconnue retombe sur les initiales du libellé. */
const BADGES: Record<string, string> = {
  "orange-money": "OM",
  "mtn-momo": "MTN",
  "carte-bancaire": "VISA",
  "paiement-livraison": "CASH",
};

function badgeFor(key: string, label: string): string {
  return (
    BADGES[key] ??
    label
      .split(/\s+/)
      .map((word) => word[0] ?? "")
      .join("")
      .slice(0, 4)
      .toUpperCase()
  );
}

export const getEnabledPaymentMethods = cache(async (): Promise<PaymentMethodView[]> => {
  const rows = await prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: { position: "asc" },
  });

  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    description: row.description,
    badge: badgeFor(row.key, row.label),
  }));
});

/**
 * Libellé à archiver sur la commande, ou `null` si la clé n'est pas (ou plus)
 * un moyen de paiement activé. Le libellé est figé sur la commande : le
 * renommer plus tard au back-office ne doit pas réécrire l'historique.
 */
export async function resolvePaymentMethod(key: unknown): Promise<{ key: string; label: string } | null> {
  if (typeof key !== "string" || key.length === 0) return null;

  const row = await prisma.paymentMethod.findFirst({
    where: { key, enabled: true },
    select: { key: true, label: true },
  });
  return row ?? null;
}
