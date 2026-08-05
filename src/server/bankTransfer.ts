/**
 * Coordonnées et instructions du virement bancaire, éditables depuis
 * l'administration et lues à deux endroits : la page de confirmation de
 * commande et l'e-mail de confirmation. Une seule source, aucune divergence
 * possible entre l'écran et le courrier.
 *
 * Le stockage réutilise la table générique `Setting` (clé/valeur) : une seule
 * ligne, de clé `bank_transfer`, dont la valeur est un JSON. Pas de modèle
 * dédié à maintenir pour cinq champs de texte.
 *
 * Toute lecture retombe sur des valeurs vides si la ligne est absente ou
 * illisible : la commande et son e-mail ne doivent jamais échouer parce que le
 * commerçant n'a pas encore saisi son IBAN.
 */

import { cache } from "react";
import { prisma } from "@/server/prisma";

const SETTING_KEY = "bank_transfer";

/** Clé du moyen de paiement « virement bancaire » dans la table PaymentMethod. */
export const BANK_TRANSFER_METHOD_KEY = "banque";

export interface BankTransferSettings {
  /** Titulaire du compte (bénéficiaire du virement). */
  holder: string;
  iban: string;
  bic: string;
  /** Type de virement, ex. « Virement instantané » ou « Virement SEPA ». */
  transferType: string;
}

const EMPTY: BankTransferSettings = {
  holder: "",
  iban: "",
  bic: "",
  transferType: "",
};

/** Vrai dès qu'un IBAN est renseigné : sans lui, aucune instruction n'a de sens. */
export function isBankTransferConfigured(settings: BankTransferSettings): boolean {
  return settings.iban.trim().length > 0;
}

function coerce(value: unknown): BankTransferSettings {
  if (!value || typeof value !== "object") return EMPTY;
  const raw = value as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    holder: str(raw.holder),
    iban: str(raw.iban),
    bic: str(raw.bic),
    transferType: str(raw.transferType),
  };
}

/**
 * Coordonnées enregistrées, ou champs vides à défaut. Mise en cache pour la
 * durée du rendu : la page de confirmation et le pied de page n'interrogent la
 * base qu'une fois.
 */
export const getBankTransferSettings = cache(async (): Promise<BankTransferSettings> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return EMPTY;
    return coerce(JSON.parse(row.value));
  } catch {
    return EMPTY;
  }
});

/** Enregistre les coordonnées après nettoyage des espaces superflus. */
export async function saveBankTransferSettings(
  input: BankTransferSettings,
): Promise<BankTransferSettings> {
  const clean: BankTransferSettings = {
    holder: input.holder.trim(),
    // L'IBAN et le BIC se lisent groupés : on retire les espaces de début et de
    // fin mais on garde la saisie du commerçant telle qu'il l'a mise en forme.
    iban: input.iban.trim(),
    bic: input.bic.trim(),
    transferType: input.transferType.trim(),
  };

  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: SETTING_KEY, value: JSON.stringify(clean) },
  });

  return clean;
}
