import { prisma } from "@/server/prisma";
import { numeroFactureSuivant, PREFIXE_FACTURE } from "./facture-numero";
// `import type` et non `import` : orders.ts importe ce module, l'inverse
// créerait un cycle à l'exécution. Un import de type est effacé à la
// compilation, donc il n'y en a pas.
import type { OrderRecord } from "@/server/orders";

/**
 * Émission de la facture.
 *
 * Une facture n'existe QU'APRÈS encaissement. Tant qu'un paiement n'est pas
 * reçu, il n'y a pas de document comptable à produire — c'est ce qui distingue
 * une facture d'un accusé de réception de commande.
 */

/** Nombre de reprises sur collision de numéro, comme pour les commandes. */
const TENTATIVES = 5;

/**
 * Faut-il émettre une facture pour cette bascule de statut ?
 *
 * Seule la transition VERS « payée », depuis un autre statut, la déclenche. Un
 * remboursement appellera un avoir, prévu au lot 3, pas une nouvelle facture.
 */
export function doitEmettreFacture(ancien: string, nouveau: string): boolean {
  return nouveau === "payee" && ancien !== "payee";
}

/**
 * Alloue un numéro et écrit la facture. Rend le numéro, ou `null` si une
 * facture existait déjà pour cette commande.
 *
 * L'unicité réelle vient de la contrainte en base, pas de la lecture : deux
 * encaissements simultanés liraient le même « dernier numéro ». On réessaie
 * sur collision, exactement comme le fait la création de commande.
 */
export async function emettreFacture(order: OrderRecord): Promise<string | null> {
  const annee = new Date().getFullYear();

  for (let tentative = 0; tentative < TENTATIVES; tentative += 1) {
    const derniere = await prisma.invoice.findFirst({
      where: { number: { startsWith: `${PREFIXE_FACTURE}${annee}-` } },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    try {
      const creee = await prisma.invoice.create({
        data: {
          number: numeroFactureSuivant(derniere?.number ?? null, annee),
          orderId: order.id,
          // Recopié, jamais lu depuis la commande par la suite : ce qui a été
          // facturé ne suit pas une correction ultérieure.
          totalCents: order.totalCents,
          currency: order.currency || "XAF",
        },
        select: { number: true },
      });
      return creee.number;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;

      // Collision sur `orderId` : la facture existe déjà, rien à faire. C'est
      // le cas d'un webhook rejoué qui aurait franchi la sortie anticipée.
      const existante = await prisma.invoice.findUnique({
        where: { orderId: order.id },
        select: { number: true },
      });
      if (existante) return null;

      // Sinon la collision porte sur le numéro : on en reprend un.
      if (tentative === TENTATIVES - 1) throw error;
    }
  }

  return null;
}
