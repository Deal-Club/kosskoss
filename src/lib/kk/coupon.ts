/**
 * Codes promo — types et arithmétique pure.
 *
 * Comme pour le bandeau, ce module est neutre : le back-office et le tunnel de
 * commande sont des composants clients, et importer `src/server/coupons.ts`
 * depuis le navigateur y embarquerait Prisma et le driver `pg`.
 *
 * Le calcul de la remise vit ici et nulle part ailleurs : l'estimation affichée
 * au client et le montant réellement facturé sortent donc de la même fonction,
 * et ne peuvent pas diverger.
 */

export type CouponKind = "pourcentage" | "montant";

export interface CouponView {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  minSubtotalCents: number;
  maxDiscountCents: number;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number;
  usedCount: number;
  active: boolean;
  description: string;
}

/** Motifs de refus, traduits pour le client par `MESSAGES_COUPON`. */
export type CouponError =
  | "code_absent"
  | "code_inconnu"
  | "code_inactif"
  | "code_expire"
  | "code_pas_encore_valide"
  | "code_epuise"
  | "montant_insuffisant";

export const MESSAGES_COUPON: Record<CouponError, string> = {
  code_absent: "Saisissez un code promo.",
  code_inconnu: "Ce code n'existe pas.",
  code_inactif: "Ce code n'est plus actif.",
  code_expire: "Ce code a expiré.",
  code_pas_encore_valide: "Ce code n'est pas encore valable.",
  code_epuise: "Ce code a atteint son nombre maximal d'utilisations.",
  montant_insuffisant: "Votre panier n'atteint pas le montant minimum de ce code.",
};

export interface CouponApplique {
  code: string;
  kind: CouponKind;
  /** Remise en FCFA entiers, déjà plafonnée et bornée au sous-total. */
  discountCents: number;
  /** Libellé court affiché à côté de la remise, par ex. « −10 % ». */
  label: string;
}

export type ResultatCoupon =
  | { ok: true; coupon: CouponApplique }
  | { ok: false; error: CouponError; message: string };

/**
 * Normalise la saisie : majuscules, sans espaces ni tirets décoratifs.
 * « bienvenue-10 » et « BIENVENUE 10 » désignent le même code.
 */
export function normaliserCode(saisie: unknown): string {
  return String(saisie ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

export function estCouponKind(valeur: string): valeur is CouponKind {
  return valeur === "pourcentage" || valeur === "montant";
}

/**
 * Remise due pour un sous-total donné.
 *
 * Deux garde-fous : le plafond éventuel du code, et le sous-total lui-même —
 * une remise ne peut pas dépasser ce que le client doit, sinon la boutique lui
 * devrait de l'argent.
 */
export function calculerRemise(
  kind: CouponKind,
  value: number,
  subtotalCents: number,
  maxDiscountCents: number,
): number {
  const brut =
    kind === "pourcentage"
      ? Math.round((subtotalCents * Math.min(100, Math.max(0, value))) / 100)
      : Math.max(0, value);

  const plafonne = maxDiscountCents > 0 ? Math.min(brut, maxDiscountCents) : brut;
  return Math.max(0, Math.min(plafonne, subtotalCents));
}
