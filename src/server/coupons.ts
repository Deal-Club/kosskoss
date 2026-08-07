import { prisma } from "@/server/prisma";

/**
 * Codes de réduction.
 *
 * Règle unique et non négociable : **le montant de la remise est toujours
 * recalculé ici, à partir de la base**. Le tunnel de commande affiche une
 * estimation pour que le client sache ce qu'il paiera, mais cette estimation
 * n'est jamais transmise au serveur, et le serveur ne la lirait pas si elle
 * l'était. Un navigateur qui annoncerait « remise : 50 000 FCFA » n'obtiendrait
 * que la remise réellement attachée au code.
 *
 * Conséquence assumée : un code qui expire entre l'affichage du tunnel et la
 * validation du paiement est refusé au dernier moment. La commande passe alors
 * au prix plein plutôt que d'honorer une remise périmée.
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

function estKind(valeur: string): valeur is CouponKind {
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

/**
 * Valide un code pour un sous-total donné et rend la remise applicable.
 *
 * Utilisé aux deux bouts : par l'API que le tunnel interroge pour afficher la
 * remise, et par `createKossOrder` juste avant d'écrire la commande. Le même
 * code des deux côtés, donc pas d'écart possible entre ce qui est montré et ce
 * qui est facturé.
 */
export async function validerCoupon(
  saisie: unknown,
  subtotalCents: number,
): Promise<ResultatCoupon> {
  const code = normaliserCode(saisie);
  if (!code) return { ok: false, error: "code_absent", message: MESSAGES_COUPON.code_absent };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { ok: false, error: "code_inconnu", message: MESSAGES_COUPON.code_inconnu };

  if (!coupon.active) {
    return { ok: false, error: "code_inactif", message: MESSAGES_COUPON.code_inactif };
  }

  const maintenant = new Date();
  if (coupon.startsAt && coupon.startsAt > maintenant) {
    return {
      ok: false,
      error: "code_pas_encore_valide",
      message: MESSAGES_COUPON.code_pas_encore_valide,
    };
  }
  if (coupon.endsAt && coupon.endsAt < maintenant) {
    return { ok: false, error: "code_expire", message: MESSAGES_COUPON.code_expire };
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "code_epuise", message: MESSAGES_COUPON.code_epuise };
  }
  if (subtotalCents < coupon.minSubtotalCents) {
    return {
      ok: false,
      error: "montant_insuffisant",
      message: MESSAGES_COUPON.montant_insuffisant,
    };
  }

  const kind = estKind(coupon.kind) ? coupon.kind : "pourcentage";
  const discountCents = calculerRemise(kind, coupon.value, subtotalCents, coupon.maxDiscountCents);

  return {
    ok: true,
    coupon: {
      code: coupon.code,
      kind,
      discountCents,
      label: kind === "pourcentage" ? `−${coupon.value} %` : "Remise",
    },
  };
}

/**
 * Incrémente le compteur d'usage, une fois la commande écrite.
 *
 * `updateMany` filtré plutôt que `update` : si deux commandes valident le
 * dernier exemplaire d'un code au même instant, la condition sur `usedCount`
 * fait que la seconde ne passe pas — c'est la base qui arbitre, pas l'ordre des
 * requêtes. L'échec est silencieux : refuser une commande déjà payée pour un
 * compteur dépassé d'une unité serait pire que la laisser passer.
 */
export async function consommerCoupon(code: string): Promise<void> {
  const normalise = normaliserCode(code);
  if (!normalise) return;

  await prisma.coupon.updateMany({
    where: {
      code: normalise,
      OR: [{ maxUses: 0 }, { usedCount: { lt: prisma.coupon.fields.maxUses } }],
    },
    data: { usedCount: { increment: 1 } },
  });
}

// ---- Administration ----

function toView(ligne: {
  id: string;
  code: string;
  kind: string;
  value: number;
  minSubtotalCents: number;
  maxDiscountCents: number;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number;
  usedCount: number;
  active: boolean;
  description: string;
}): CouponView {
  return {
    id: ligne.id,
    code: ligne.code,
    kind: estKind(ligne.kind) ? ligne.kind : "pourcentage",
    value: ligne.value,
    minSubtotalCents: ligne.minSubtotalCents,
    maxDiscountCents: ligne.maxDiscountCents,
    startsAt: ligne.startsAt?.toISOString() ?? null,
    endsAt: ligne.endsAt?.toISOString() ?? null,
    maxUses: ligne.maxUses,
    usedCount: ligne.usedCount,
    active: ligne.active,
    description: ligne.description,
  };
}

export async function listCoupons(): Promise<CouponView[]> {
  const lignes = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return lignes.map(toView);
}

export interface CouponInput {
  code: string;
  kind: CouponKind;
  value: number;
  minSubtotalCents?: number;
  maxDiscountCents?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number;
  active?: boolean;
  description?: string;
}

function entier(valeur: unknown, defaut = 0): number {
  const n = Number(valeur);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : defaut;
}

function dateOuNull(valeur: unknown): Date | null {
  if (!valeur) return null;
  const d = new Date(String(valeur));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Champs communs à la création et à la mise à jour, déjà assainis. */
function donnees(entree: CouponInput) {
  const kind = estKind(entree.kind) ? entree.kind : "pourcentage";
  // Un pourcentage au-delà de 100 offrirait le produit et créerait un avoir.
  const value = kind === "pourcentage" ? Math.min(100, Math.max(1, entier(entree.value, 1))) : entier(entree.value);

  return {
    kind,
    value,
    minSubtotalCents: entier(entree.minSubtotalCents),
    maxDiscountCents: entier(entree.maxDiscountCents),
    startsAt: dateOuNull(entree.startsAt),
    endsAt: dateOuNull(entree.endsAt),
    maxUses: entier(entree.maxUses),
    active: entree.active !== false,
    description: String(entree.description ?? "").slice(0, 200),
  };
}

export async function createCoupon(entree: CouponInput): Promise<CouponView> {
  const code = normaliserCode(entree.code);
  if (!code) throw new Error("Le code est obligatoire.");

  const cree = await prisma.coupon.create({ data: { code, ...donnees(entree) } });
  return toView(cree);
}

export async function updateCoupon(id: string, entree: CouponInput): Promise<CouponView | null> {
  const existe = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;

  const code = normaliserCode(entree.code);
  const modifie = await prisma.coupon.update({
    where: { id },
    data: { ...(code ? { code } : {}), ...donnees(entree) },
  });
  return toView(modifie);
}

export async function deleteCoupon(id: string): Promise<void> {
  await prisma.coupon.deleteMany({ where: { id } });
}
