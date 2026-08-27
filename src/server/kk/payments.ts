import { cache } from "react";
import { prisma } from "@/server/prisma";
import { pickText } from "@/server/localizedContent";
import type { Locale } from "@/i18n/routing";

/**
 * Moyens de paiement proposés au tunnel de commande.
 *
 * Ils étaient jusqu'ici écrits en dur dans le formulaire — trois entrées, alors
 * que le back-office en gère quatre. Le paiement à la livraison, activé en base
 * et déterminant sur ce marché, n'était donc jamais proposé au client, et
 * désactiver une option depuis l'administration n'avait aucun effet sur la
 * boutique. La liste est désormais lue en base, et le serveur revalide la clé
 * reçue contre cette même liste au moment de créer la commande.
 *
 * Label et description passent par pickText, même règle de repli que le reste
 * de la boutique : c'est ici, à la caisse, qu'ils s'affichent au client.
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

export const getEnabledPaymentMethods = cache(async (locale: Locale): Promise<PaymentMethodView[]> => {
  const rows = await prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: { position: "asc" },
  });

  const english = locale === "en";
  return rows.map((row) => ({
    key: row.key,
    label: pickText(row.label, english ? row.labelEn : undefined),
    description: pickText(row.description, english ? row.descriptionEn : undefined),
    // Le sigle vient de la clé, jamais du libellé traduit : "OM"/"MTN" ne
    // varient pas avec la langue, seul le repli sur les initiales dépendrait
    // du texte affiché — on le calcule donc sur le libellé français.
    badge: badgeFor(row.key, row.label),
  }));
});

/**
 * Libellé à archiver sur la commande, ou `null` si la clé n'est pas (ou plus)
 * un moyen de paiement activé. Le libellé est figé sur la commande : le
 * renommer plus tard au back-office ne doit pas réécrire l'historique.
 *
 * Il est figé DANS LA LANGUE DE L'ACHETEUR — même règle que les lignes de
 * commande (voir server/kk/checkout.ts) : c'est ce qui a été présenté au
 * client à la caisse qui fait foi, pas la version française du back-office.
 */
export async function resolvePaymentMethod(
  key: unknown,
  locale: Locale = "fr",
): Promise<{ key: string; label: string } | null> {
  if (typeof key !== "string" || key.length === 0) return null;

  const row = await prisma.paymentMethod.findFirst({
    where: { key, enabled: true },
    select: { key: true, label: true, labelEn: true },
  });
  if (!row) return null;
  return {
    key: row.key,
    label: pickText(row.label, locale === "en" ? row.labelEn : undefined),
  };
}
