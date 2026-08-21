import { prisma } from "@/server/prisma";
import type { LigneVente } from "@/lib/kk/ventes";
import type { Periode } from "@/lib/kk/periode";

/**
 * Lecture des ventes de la période, à plat.
 *
 * ── LA DATE DE RÉFÉRENCE ────────────────────────────────────────────────────
 *
 * `paidAt` quand il est posé, `createdAt` sinon. `paidAt` n'existe que depuis
 * le suivi de l'encaissement ; les commandes plus anciennes n'en ont pas, et
 * les rejeter de l'historique serait un trou que rien ne signalerait.
 *
 * ── PAS D'AGRÉGATION SQL ────────────────────────────────────────────────────
 *
 * Les totaux sont calculés en TypeScript par `@/lib/kk/ventes`, qui est testé
 * sans base. Le volume d'une jeune boutique tient en mémoire ; le jour où il
 * n'y tiendra plus, c'est ici qu'il faudra passer à une agrégation, et les
 * tests du module pur diront alors ce que la requête doit rendre.
 */

/** Fenêtre de dates portée sur la commande liée, dans les deux cas de figure. */
function fenetre(periode: Periode) {
  return [
    { paidAt: { gte: periode.du, lte: periode.au } },
    { paidAt: null, createdAt: { gte: periode.du, lte: periode.au } },
  ];
}

export async function lireVentes(periode: Periode): Promise<LigneVente[]> {
  const lignes = await prisma.orderItem.findMany({
    where: { order: { paymentStatus: "payee", OR: fenetre(periode) } },
    select: {
      quantity: true,
      unitPriceCents: true,
      lineTotalCents: true,
      unitCostCents: true,
      brand: true,
      name: true,
      variantLabel: true,
      sku: true,
      order: { select: { id: true, orderNumber: true, paidAt: true, createdAt: true } },
    },
  });

  return lignes
    .map((ligne) => ({
      orderId: ligne.order.id,
      orderNumber: ligne.order.orderNumber,
      date: ligne.order.paidAt ?? ligne.order.createdAt,
      brand: ligne.brand,
      name: ligne.name,
      variantLabel: ligne.variantLabel,
      sku: ligne.sku,
      quantity: ligne.quantity,
      unitPriceCents: ligne.unitPriceCents,
      lineTotalCents: ligne.lineTotalCents,
      unitCostCents: ligne.unitCostCents,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Commandes engagées mais pas encore encaissées.
 *
 * Ce montant se présente à part et ne s'additionne jamais à l'encaissé : le
 * confondre avec du chiffre d'affaires ferait compter deux fois la même vente
 * le jour où elle est payée.
 */
export async function lireEnCours(
  periode: Periode,
): Promise<{ nombre: number; totalCents: number }> {
  const commandes = await prisma.order.findMany({
    where: {
      // « en attente » strictement : un paiement échoué n'est pas de l'argent qui
      // arrive, et le compter ferait espérer une somme que personne ne doit.
      paymentStatus: "en_attente",
      status: { notIn: ["annulee", "remboursee"] },
      OR: fenetre(periode),
    },
    select: { totalCents: true },
  });

  return {
    nombre: commandes.length,
    totalCents: commandes.reduce((total, commande) => total + commande.totalCents, 0),
  };
}
