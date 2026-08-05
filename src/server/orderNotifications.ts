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
import { SUPERADMIN_ROLE } from "@/server/admins";
import {
  buildOrderConfirmationEmail,
  buildOrderNotificationEmail,
} from "@/server/emails/order";
import { buildInvoicePdf, invoiceFilename } from "@/server/invoice";
import { BANK_TRANSFER_METHOD_KEY, getBankTransferSettings } from "@/server/bankTransfer";
import type { OrderRecord } from "@/server/orders";

/** Vrai uniquement en développement sans SMTP configuré. */
function isMailDevFallback(): boolean {
  return process.env.NODE_ENV === "development" && !isMailConfigured();
}

/**
 * Adresses du vendeur, dans l'ordre de priorité suivant.
 *
 * 1. ORDER_NOTIFICATION_EMAILS, si elle est renseignée : liste explicite,
 *    séparée par des virgules. Elle fait autorité seule — c'est le moyen de
 *    router les commandes vers une boîte dédiée (ventes@, service@) sans
 *    toucher au code.
 * 2. Sinon : la boîte de la boutique (ADMIN_EMAIL) et les comptes du
 *    back-office encore actifs.
 *
 * Les superadmins sont écartés du second cas. Ce rôle est volontairement
 * invisible dans tout le back-office (voir src/server/admins.ts) : le faire
 * apparaître dans l'historique d'envoi des commandes le révélerait. Un
 * superadmin qui veut ces messages s'ajoute explicitement au cas 1.
 *
 * Doublons et casse sont normalisés.
 */
async function sellerRecipients(): Promise<string[]> {
  const explicit = (process.env.ORDER_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.includes("@"));
  if (explicit.length > 0) return [...new Set(explicit)];

  const addresses = new Set<string>();

  const shopBox = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (shopBox) addresses.add(shopBox);

  try {
    const admins = await prisma.adminUser.findMany({
      where: { active: true, role: { not: SUPERADMIN_ROLE } },
      select: { email: true },
      orderBy: { createdAt: "asc" },
    });
    for (const admin of admins) {
      const email = admin.email.trim().toLowerCase();
      if (email) addresses.add(email);
    }
  } catch (error) {
    // La liste des comptes est un complément : sans elle, la boîte de la
    // boutique reste notifiée.
    console.error("[bestellung] Lecture des comptes back-office impossible :", error);
  }

  return [...addresses];
}

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
    console.error(`[bestellung] Envoi impossible (${context} → ${to}) :`, error);
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
    console.error("[bestellung] Journalisation de l'e-mail impossible :", error);
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
      `[bestellung] ${order.orderNumber} : aucun SMTP configuré — confirmation vers ${order.email} et notification vendeur non envoyées.`,
    );
    return;
  }

  const sellers = await sellerRecipients();

  if (sellers.length === 0) {
    console.error(
      "[bestellung] Aucun destinataire vendeur : renseigner ADMIN_EMAIL ou activer un compte back-office.",
    );
  }

  // Coordonnées du virement chargées une fois : la confirmation du client les
  // affiche pour une commande réglée par virement, la notification vendeur non.
  const bankTransfer = await getBankTransferSettings();
  const buyerMessage = buildOrderConfirmationEmail(order, bankTransfer);
  const sellerMessage = buildOrderNotificationEmail(order);

  // Facture PDF jointe à la confirmation du client, et à la notification du
  // vendeur qui en garde ainsi un exemplaire identique. Sa génération ne doit
  // pas empêcher l'envoi : mieux vaut une confirmation sans pièce jointe que
  // pas de confirmation du tout.
  let facture: MailAttachment[] | undefined;
  try {
    facture = [
      {
        filename: invoiceFilename(order),
        // Les coordonnées du compte ne sont portées sur la facture que si la
        // commande se règle par virement.
        content: await buildInvoicePdf(
          order,
          order.paymentMethodKey === BANK_TRANSFER_METHOD_KEY ? bankTransfer : undefined,
        ),
        contentType: "application/pdf",
      },
    ];
  } catch (error) {
    console.error(`[bestellung] ${order.orderNumber} : facture PDF non générée :`, error);
  }

  // Les deux envois partent ensemble : la confirmation du client ne doit pas
  // attendre que la notification interne soit acceptée, ni l'inverse.
  const [buyer, ...delivered] = await Promise.all([
    deliver(order.email, { ...buyerMessage, attachments: facture }, "confirmation client"),
    ...sellers.map((address) =>
      deliver(address, { ...sellerMessage, attachments: facture }, "notification vendeur"),
    ),
  ]);

  const sellersDelivered = delivered.filter((address): address is string => address !== null);

  const note = [
    buyer
      ? `Confirmation envoyée au client (${order.email}).`
      : `Échec de la confirmation au client (${order.email}).`,
    sellersDelivered.length > 0
      ? `Notification vendeur envoyée à ${sellersDelivered.join(", ")}.`
      : "Notification vendeur non envoyée.",
    facture ? "Facture PDF jointe." : "Facture PDF absente.",
  ].join(" ");

  await logToOrder(order.id, note);
}
