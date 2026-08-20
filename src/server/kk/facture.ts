import { prisma } from "@/server/prisma";
import { numeroFactureSuivant, PREFIXE_FACTURE } from "./facture-numero";
// `import type` pour OrderRecord : orders.ts importe ce module, l'inverse
// créerait un cycle à l'exécution qu'un import de type évite puisqu'il est
// effacé à la compilation. `recordOrderEvent`, juste en dessous, est en
// revanche un import de VALEUR : il referme le cycle orders.ts → facture.ts →
// orders.ts. Ça reste sans danger ici parce qu'aucun des deux modules
// n'appelle l'export de l'autre pendant l'évaluation du module (au niveau
// racine) — seulement depuis l'intérieur de fonctions, exécutées après que les
// deux modules sont entièrement chargés.
import type { OrderRecord } from "@/server/orders";
import { recordOrderEvent } from "@/server/orders";
// Module feuille déjà importé par orders.ts : aucun cycle introduit. Typer sur
// l'union plutôt que sur `string` fait qu'un renommage de statut dans
// PAYMENT_STATUSES casse la compilation ici, comme il casse déjà le
// `paymentStatus === "payee"` voisin dans updatePaymentStatus — au lieu de
// laisser doitEmettreFacture cesser silencieusement d'émettre des factures.
import type { PaymentStatus } from "@/lib/orderStatus";
import { buildInvoicePdf, invoiceFilename } from "@/server/invoice";
import { isMailConfigured } from "@/lib/mailer";
import { sendPaymentReceivedEmail } from "./emails";

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
export function doitEmettreFacture(ancien: PaymentStatus, nouveau: PaymentStatus): boolean {
  return nouveau === "payee" && ancien !== "payee";
}

/** Facture fraîchement écrite : son numéro et sa date d'émission. */
export interface FactureEmise {
  numero: string;
  /**
   * `Invoice.issuedAt`, relu de la ligne créée plutôt que recalculé ici : c'est
   * l'horloge de la base qui fait foi, et c'est cette date — pas celle de la
   * commande — que le PDF doit imprimer.
   */
  issuedAt: Date;
}

/**
 * Alloue un numéro et écrit la facture. Rend le numéro et sa date d'émission,
 * ou `null` si une facture existait déjà pour cette commande.
 *
 * L'unicité réelle vient de la contrainte en base, pas de la lecture : deux
 * encaissements simultanés liraient le même « dernier numéro ». On réessaie
 * sur collision, exactement comme le fait la création de commande.
 */
export async function emettreFacture(order: OrderRecord): Promise<FactureEmise | null> {
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
        select: { number: true, issuedAt: true },
      });
      return { numero: creee.number, issuedAt: creee.issuedAt };
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

/**
 * Émet la facture, puis l'envoie au client.
 *
 * Les deux moitiés sont séparées volontairement : l'écriture en base doit
 * réussir ou être signalée, l'envoi peut échouer sans faire perdre la facture
 * elle-même — la ligne `Invoice` créée par `emettreFacture` reste en base même
 * si la génération du PDF ou l'envoi échouent ensuite. Attention : le renvoi
 * manuel depuis le back-office n'est PAS implémenté (il est prévu dans un lot
 * ultérieur) — en attendant, un échec à ce stade doit rester visible dans
 * l'historique de la commande, avec un message qui dit la vérité : la facture
 * a été émise, seule sa livraison a raté. D'où le try/catch local ci-dessous,
 * qui porte lui-même la garantie « n'échoue jamais » au lieu de compter sur
 * chaque futur appelant pour l'ajouter.
 */
export async function emettreEtEnvoyerFacture(order: OrderRecord): Promise<void> {
  const facture = await emettreFacture(order);
  // `null` : une facture existait déjà. Ne pas renvoyer d'e-mail, le client
  // l'a reçue la première fois.
  if (!facture) return;

  const { numero, issuedAt } = facture;

  // Sans SMTP configuré, sendPaymentReceivedEmail serait un no-op silencieux :
  // inutile de payer le coût de générer un PDF pour un envoi qui n'aura pas lieu.
  if (!isMailConfigured()) {
    // Mais la facture, elle, EXISTE : la taire ferait croire à l'opérateur
    // qu'aucun document n'a été émis, alors que la séquence a bien consommé un
    // numéro qu'il devra justifier auprès du comptable.
    await consigner(
      order.id,
      `Facture ${numero} émise, non envoyée : aucun SMTP configuré. À transmettre au client à la main.`,
    );
    return;
  }

  try {
    const pdf = await buildInvoicePdf(order, numero, issuedAt);
    await sendPaymentReceivedEmail({
      to: order.email,
      firstName: order.billing.firstName,
      orderNumber: order.orderNumber,
      numeroFacture: numero,
      totalFcfa: order.totalCents,
      facturePdf: pdf,
      nomFichier: invoiceFilename(numero),
    });
    // Le succès aussi se consigne. Le back-office n'a ni écran des factures ni
    // renvoi manuel : l'historique de la commande est la SEULE surface où
    // l'opérateur peut lire qu'une facture est partie, et vers quelle adresse.
    // N'y écrire que les échecs laisserait le cas nominal muet.
    await consigner(order.id, `Facture ${numero} émise et envoyée à ${order.email}.`);
  } catch (error) {
    // La facture EXISTE déjà en base à ce stade (numero non nul, retourné par
    // emettreFacture) : ce qui vient d'échouer, c'est sa livraison, pas son
    // émission. Le message doit le dire explicitement — sinon l'opérateur lit
    // « facture non émise » pour une commande qui, elle, a bel et bien une
    // facture, seulement pas encore reçue par le client.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[facture] livraison échouée après émission", { orderId: order.id, numero, message });
    await consigner(
      order.id,
      `⚠️ Facture ${numero} émise mais non livrée au client (${message}). Le renvoi manuel depuis le back-office n'est pas encore outillé : à traiter à la main.`,
    );
  }
}

/**
 * Écrit un événement « paiement » sur la commande sans jamais lever.
 *
 * Tous les appels de ce module sont sur le chemin d'un paiement déjà encaissé :
 * une écriture d'historique qui échoue ne doit pas faire répondre 500 au
 * webhook, qui redéliverait. `recordOrderEvent` touche par ailleurs la même
 * base dont l'indisponibilité a pu causer l'échec qu'on cherche à consigner —
 * le `console.error` de l'appelant reste alors la seule trace.
 */
async function consigner(orderId: string, note: string): Promise<void> {
  try {
    await recordOrderEvent(orderId, "paiement", note);
  } catch (error) {
    console.error("[facture] historique non écrit", { orderId, note, error });
  }
}
