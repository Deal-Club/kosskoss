import { prisma } from "@/server/prisma";
import { repartirRemise, type LigneVente } from "@/lib/kk/ventes";
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
 *
 * ── ANNULÉE SORT, REMBOURSÉE RESTE ──────────────────────────────────────────
 *
 * Une commande payée puis annulée remet la marchandise en stock : elle n'est
 * jamais partie, et la compter dans le chiffre d'affaires la ferait entrer
 * deux fois dans la comptabilité (une fois ici, une fois nulle part quand le
 * stock revient). Une commande remboursée, elle, a bien été encaissée puis
 * rendue : ce lot ne couvre pas les avoirs, et la retirer serait créer un trou
 * que rien ne signalerait. C'est un choix, pas un oubli.
 *
 * ── LA REMISE EST RÉPARTIE AU PRORATA DES LIGNES ────────────────────────────
 *
 * Un code promo réduit `Order.totalCents`, jamais les `lineTotalCents` des
 * lignes qui le composent : sommer les lignes brutes surévaluerait le chiffre
 * d'affaires et la marge du montant exact des remises accordées. Chaque ligne
 * reçoit donc sa part, calculée par `repartirRemise` — voir ce module pour le
 * détail de l'arrondi.
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
    where: {
      order: {
        paymentStatus: "payee",
        // Annulée sort, remboursée reste : voir le commentaire de tête.
        status: { not: "annulee" },
        OR: fenetre(periode),
      },
    },
    select: {
      quantity: true,
      unitPriceCents: true,
      lineTotalCents: true,
      unitCostCents: true,
      brand: true,
      name: true,
      variantLabel: true,
      sku: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          paidAt: true,
          createdAt: true,
          discountCents: true,
          subtotalCents: true,
        },
      },
    },
    // La spécification annonce un `orderBy` : il rend le résultat SQL
    // déterministe (jusqu'à l'`id`, clé finale) plutôt que de dépendre d'un
    // ordre de retour non garanti par la base. `paidAt` et `createdAt` ne
    // peuvent pas se combiner en un seul `orderBy` Prisma (la date de
    // référence est un COALESCE des deux, que Prisma ne sait pas exprimer) :
    // le tri définitif reste donc le tri en mémoire ci-dessous, sur la date
    // effective. Comme `Array.prototype.sort` est stable, deux lignes de même
    // date gardent l'ordre que cet `orderBy` leur a donné — ce qui est
    // exactement ce qui rend deux exports de la même période identiques.
    orderBy: [{ order: { paidAt: "asc" } }, { order: { createdAt: "asc" } }, { id: "asc" }],
  });

  // Regroupe par commande : la remise se répartit sur TOUTES les lignes d'une
  // même commande, jamais sur une seule à la fois.
  type LigneBrute = (typeof lignes)[number];
  const parCommande = new Map<string, LigneBrute[]>();
  for (const ligne of lignes) {
    const groupe = parCommande.get(ligne.order.id);
    if (groupe) groupe.push(ligne);
    else parCommande.set(ligne.order.id, [ligne]);
  }

  const resultat: LigneVente[] = [];
  for (const groupe of parCommande.values()) {
    const { discountCents, subtotalCents } = groupe[0].order;
    const remises = repartirRemise(groupe, discountCents, subtotalCents);

    groupe.forEach((ligne, index) => {
      resultat.push({
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
        remiseCents: remises[index],
        unitCostCents: ligne.unitCostCents,
      });
    });
  }

  return resultat.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Commandes engagées mais pas encore encaissées.
 *
 * Ce montant se présente à part et ne s'additionne jamais à l'encaissé : le
 * confondre avec du chiffre d'affaires ferait compter deux fois la même vente
 * le jour où elle est payée.
 *
 * `Order.totalCents` est déjà net de remise (`subtotalCents − discountCents`,
 * voir `createKossOrder`) et ne porte pas de livraison : cette assiette est
 * donc la même que le chiffre d'affaires net de `lireVentes` ci-dessus, ce qui
 * rend les deux montants directement comparables — pour les commandes issues
 * du tunnel `kk`, seul chemin atteignable depuis une page en ligne. L'autre
 * chemin de création de commande (`src/server/orders.ts::createOrder`, mort
 * côté navigation mais dont la route HTTP existe toujours) calcule
 * `totalCents` autrement et y inclut la livraison ; une commande créée par ce
 * chemin romprait la comparaison.
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
