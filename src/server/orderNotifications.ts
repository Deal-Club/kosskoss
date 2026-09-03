/**
 * Envoi des e-mails déclenchés par une commande validée.
 *
 * Appelé une fois la commande écrite en base, jamais avant : une panne du
 * serveur SMTP ne doit pas faire échouer une commande déjà enregistrée et déjà
 * décomptée du stock. Toutes les erreurs sont donc avalées ici et consignées
 * dans les journaux du serveur ainsi que dans l'historique de la commande, où
 * le back-office les affiche.
 *
 * Deux destinataires :
 *  - l'acheteur, à l'adresse saisie dans le tunnel ;
 *  - le vendeur, c'est-à-dire la boîte de la boutique (ADMIN_EMAIL) et tous les
 *    comptes du back-office encore actifs.
 *
 * Ces messages sont transactionnels : ils ne tiennent pas compte de la table
 * EmailSuppression, qui ne concerne que les campagnes commerciales. Un client
 * désabonné de la newsletter doit malgré tout recevoir la confirmation de la
 * commande qu'il vient de passer — c'est une obligation contractuelle
 * (§ 312i al. 1 nº 3 BGB), pas de la publicité.
 */

import { isMailConfigured, sendMail } from "@/lib/mailer";
import type { MailAttachment } from "@/lib/mailer";
import { prisma } from "@/server/prisma";
import { sellerRecipients } from "@/server/destinatairesVendeur";
import {
  buildOrderConfirmationEmail,
  buildOrderNotificationEmail,
} from "@/server/emails/order";
import { getBankTransferSettings } from "@/server/bankTransfer";
import type { OrderRecord } from "@/server/orders";

/** Vrai uniquement en développement sans SMTP configuré. */
function isMailDevFallback(): boolean {
  return process.env.NODE_ENV === "development" && !isMailConfigured();
}

// `sellerRecipients` vit désormais dans `server/destinatairesVendeur.ts` : le
// tunnel KossKoss en a besoin lui aussi, et n'a pas à importer ce module-ci
// pour l'obtenir. Voir l'en-tête de ce fichier-là.

/** Envoi unitaire tolérant aux pannes. Renvoie l'adresse si le serveur l'a acceptée. */
async function deliver(
  to: string,
  message: { subject: string; html: string; text: string; attachments?: MailAttachment[] },
  context: string,
): Promise<string | null> {
  try {
    await sendMail({ to, ...message });
    return to;
  } catch (error) {
    console.error(`[commande] Envoi impossible (${context} → ${to}) :`, error);
    return null;
  }
}

/** Trace l'issue des envois dans l'historique de la commande. */
async function logToOrder(orderId: string, note: string): Promise<void> {
  try {
    await prisma.orderEvent.create({
      data: { orderId, kind: "email", note, createdBy: "system" },
    });
  } catch (error) {
    console.error("[commande] Journalisation de l'e-mail impossible :", error);
  }
}

/**
 * Confirme la commande à l'acheteur et la signale au vendeur.
 *
 * Ne lève jamais : l'appelant HTTP doit pouvoir répondre « commande
 * enregistrée » même si l'e-mail n'est pas parti.
 */
export async function sendOrderEmails(order: OrderRecord): Promise<void> {
  if (isMailDevFallback()) {
    console.info(
      `[commande] ${order.orderNumber} : aucun SMTP configuré — confirmation vers ${order.email} et notification vendeur non envoyées.`,
    );
    return;
  }

  const sellers = await sellerRecipients();

  if (sellers.length === 0) {
    console.error(
      "[commande] Aucun destinataire vendeur : renseigner ADMIN_EMAIL ou activer un compte back-office.",
    );
  }

  // Coordonnées du virement chargées une fois : la confirmation du client les
  // affiche pour une commande réglée par virement, la notification vendeur non.
  const bankTransfer = await getBankTransferSettings();
  const buyerMessage = buildOrderConfirmationEmail(order, bankTransfer);
  const sellerMessage = buildOrderNotificationEmail(order);

  // L'ancienne route /api/checkout n'émet plus de facture : depuis le lot 1,
  // la facture est numérotée et émise à l'encaissement par server/kk/facture.ts.

  // Les deux envois partent ensemble : la confirmation du client ne doit pas
  // attendre que la notification interne soit acceptée, ni l'inverse.
  const [buyer, ...delivered] = await Promise.all([
    deliver(order.email, buyerMessage, "confirmation client"),
    ...sellers.map((address) => deliver(address, sellerMessage, "notification vendeur")),
  ]);

  const sellersDelivered = delivered.filter((address): address is string => address !== null);

  const note = [
    buyer
      ? `Confirmation envoyée au client (${order.email}).`
      : `Échec de la confirmation au client (${order.email}).`,
    sellersDelivered.length > 0
      ? `Notification vendeur envoyée à ${sellersDelivered.join(", ")}.`
      : "Notification vendeur non envoyée.",
  ].join(" ");

  await logToOrder(order.id, note);
}
