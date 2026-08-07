import { prisma } from "@/server/prisma";
import {
  calculerRemise,
  estCouponKind,
  MESSAGES_COUPON,
  normaliserCode,
  type CouponKind,
  type CouponView,
  type ResultatCoupon,
} from "@/lib/kk/coupon";

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

// Types, messages et arithmétique vivent dans `src/lib/kk/coupon` : le tunnel
// de commande et le back-office sont des composants clients et ne peuvent pas
// importer ce module-ci, qui tire Prisma.
export type {
  CouponKind,
  CouponView,
  CouponError,
  CouponApplique,
  ResultatCoupon,
} from "@/lib/kk/coupon";
export { MESSAGES_COUPON, normaliserCode, calculerRemise } from "@/lib/kk/coupon";

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

  const kind = estCouponKind(coupon.kind) ? coupon.kind : "pourcentage";
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
    kind: estCouponKind(ligne.kind) ? ligne.kind : "pourcentage",
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
  const kind = estCouponKind(entree.kind) ? entree.kind : "pourcentage";
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
