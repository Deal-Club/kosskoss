import { prisma } from "@/server/prisma";
import {
  creerPaiement,
  DEVISE_PRESTATAIRE,
  estEchoue,
  estEncaisse,
  lireConfig,
  type ConfigGeniusPay,
} from "@/server/gateways/geniuspay";
import { getOrderByNumber, recordOrderEvent, updatePaymentStatus } from "@/server/orders";

/**
 * Paiement d'une commande KossKoss, via GeniusPay.
 *
 * Ce module tient les deux moitiés du cycle : ouvrir une tentative de paiement,
 * et conclure quand le prestataire nous rappelle.
 *
 * ── UNE RÈGLE QUI GOUVERNE TOUT ─────────────────────────────────────────────
 *
 * Une commande ne passe JAMAIS en « payée » depuis le retour navigateur du
 * client. Ce retour prouve seulement qu'un onglet s'est rouvert — pas qu'un
 * franc a été encaissé. Seuls le webhook signé et, en secours, une relecture
 * directe chez le prestataire font autorité. C'est écrit noir sur blanc dans le
 * cahier des charges (docs/13 §5.2) et c'est la faute la plus coûteuse qu'un
 * tunnel de paiement puisse commettre.
 */

export const PROVIDER = "geniuspay";

/** La passerelle est-elle configurée ? Sinon le tunnel reste en manuel. */
export function paiementDisponible(): boolean {
  return lireConfig() !== null;
}

/**
 * Moyens de paiement qui ne passent PAS par la passerelle.
 *
 * Le paiement à la livraison se règle en espèces au livreur : ouvrir une
 * transaction en ligne pour lui enverrait le client sur une page de paiement
 * qu'il n'a aucune raison de voir, juste après avoir choisi de payer plus tard.
 * C'est le genre de contresens qui fait abandonner un panier déjà validé.
 *
 * La liste est en clé de moyen, telle que stockée sur la commande.
 */
const MOYENS_HORS_LIGNE = new Set(["paiement-livraison"]);

/**
 * Ce moyen de paiement demande-t-il une transaction en ligne ?
 *
 * Question posée ici et non dans la route HTTP : c'est une règle commerciale,
 * pas une préoccupation de transport.
 */
export function demandePaiementEnLigne(paymentMethodKey: string): boolean {
  return !MOYENS_HORS_LIGNE.has(paymentMethodKey);
}

// ---- Ouverture d'une tentative ----

export interface OuvertureResultat {
  urlPaiement: string;
  reference: string;
}

/**
 * Ouvre une tentative de paiement pour une commande existante.
 *
 * Chaque appel crée une NOUVELLE ligne `PaymentTransaction` : une reprise après
 * abandon ne doit pas effacer la tentative précédente. C'est cette histoire qui
 * permet, au service client, de distinguer « le client n'a jamais essayé » de
 * « il a essayé trois fois et son solde était insuffisant ».
 */
export async function ouvrirPaiement(
  orderNumber: string,
  urlBase: string,
): Promise<OuvertureResultat | null> {
  const config = lireConfig();
  if (!config) return null;

  const commande = await getOrderByNumber(orderNumber);
  if (!commande) return null;

  // Le français vit à la racine, l'anglais sous /en (localePrefix « as-needed »).
  const prefixe = commande.locale === "en" ? "/en" : "";

  const paiement = await creerPaiement(config, {
    // `totalCents` porte des FCFA entiers dans cette boutique — le nom vient de
    // mlcbois et ment (voir docs/13 §5.1). Aucune division.
    montant: commande.totalCents,
    description: `Commande ${commande.orderNumber}`,
    orderNumber: commande.orderNumber,
    client: {
      // Le nom vit sur l'adresse de facturation : la commande n'en porte pas
      // en propre.
      nom: `${commande.billing.firstName} ${commande.billing.lastName}`.trim(),
      email: commande.email,
      telephone: commande.phone,
    },
    // ── LE JETON D'ACCÈS EST INDISPENSABLE DANS L'URL DE RETOUR ─────────────
    //
    // La page de confirmation exige `?t=<accessToken>` et répond 404 sans lui
    // (voir getKossOrder). Sans ce paramètre, le client revenait de la page de
    // paiement sur une page introuvable : le paiement passait, la commande
    // basculait bien en « payée », mais l'acheteur voyait une erreur — la pire
    // impression possible juste après avoir réglé.
    //
    // Le jeton transite par le prestataire, qui le voit donc passer. C'est
    // acceptable : il détient déjà le nom, l'e-mail, le téléphone et le montant
    // de cette commande, et ce jeton n'ouvre rien d'autre que la consultation
    // de celle-ci.
    //
    // Le préfixe de langue suit la commande : un acheteur venu de /en doit
    // revenir sur /en, pas basculer en français au retour du paiement.
    urlSucces: `${urlBase}${prefixe}/confirmation/${commande.orderNumber}?t=${encodeURIComponent(commande.accessToken)}`,
    urlEchec: `${urlBase}${prefixe}/commande?paiement=echec`,
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: commande.id,
      provider: PROVIDER,
      reference: paiement.reference,
      amount: paiement.montant,
      currency: paiement.devise,
      fees: paiement.frais,
      netAmount: paiement.net,
      status: paiement.statut,
      checkoutUrl: paiement.urlPaiement,
      environment: paiement.environnement,
      rawResponse: paiement.brut,
    },
  });

  await recordOrderEvent(
    commande.id,
    "paiement",
    `Paiement ouvert chez ${PROVIDER} (${paiement.environnement}) — référence ${paiement.reference}`,
  );

  return { urlPaiement: paiement.urlPaiement, reference: paiement.reference };
}

// ---- Conclusion depuis un webhook ----

export interface EvenementPaiement {
  /** Référence de transaction chez le prestataire. */
  reference: string;
  /** Statut brut : completed, failed, cancelled… */
  statut: string;
  /** Montant annoncé par le prestataire, pour recoupement. */
  montant: number;
  /** Numéro de commande, transmis dans `metadata.order_id`. */
  orderNumber: string;
  /** Corps brut, archivé. */
  brut: string;
}

export type Issue = "encaisse" | "echoue" | "ignore" | "commande_introuvable" | "montant_incoherent";

/**
 * Applique un événement de paiement.
 *
 * Ne suppose rien de l'ordre d'arrivée : un `payment.success` peut précéder la
 * création de la transaction si le client a payé très vite, et un événement
 * peut arriver deux fois. La fonction est donc écrite pour être rejouable sans
 * effet de bord — c'est l'appelant qui garantit l'unicité par le journal des
 * webhooks, mais elle ne doit pas en dépendre pour rester correcte.
 */
export async function appliquerEvenement(evenement: EvenementPaiement): Promise<Issue> {
  const commande = evenement.orderNumber ? await getOrderByNumber(evenement.orderNumber) : undefined;
  if (!commande) return "commande_introuvable";

  // ── Recoupement du montant ────────────────────────────────────────────────
  // La signature garantit que le message vient bien du prestataire, pas que le
  // montant corresponde à la commande. Un écart signale une erreur de
  // configuration ou une manipulation : on refuse d'encaisser et on laisse la
  // commande en attente, à vérifier à la main. Mieux vaut un règlement à
  // contrôler qu'une commande expédiée pour un dixième de son prix.
  if (estEncaisse(evenement.statut) && evenement.montant !== commande.totalCents) {
    await recordOrderEvent(
      commande.id,
      "paiement",
      `⚠️ Montant incohérent : ${evenement.montant} FCFA reçus pour une commande de ${commande.totalCents} FCFA (référence ${evenement.reference}). Paiement NON validé, à vérifier.`,
    );
    return "montant_incoherent";
  }

  await majTransaction(commande.id, evenement);

  if (estEncaisse(evenement.statut)) {
    // `updatePaymentStatus` porte le statut de PAIEMENT ; le statut de
    // COMMANDE suit séparément, car une commande payée n'est pas encore
    // préparée.
    await updatePaymentStatus(commande.id, "payee", PROVIDER, `Référence ${evenement.reference}`);
    await prisma.order.update({
      where: { id: commande.id },
      data: { status: "payee" },
    });
    return "encaisse";
  }

  if (estEchoue(evenement.statut)) {
    await updatePaymentStatus(commande.id, "echouee", PROVIDER, `Référence ${evenement.reference}`);
    return "echoue";
  }

  // « pending », « processing » : le client est peut-être en train de valider
  // sur son téléphone. On enregistre l'avancement sans rien conclure.
  return "ignore";
}

/**
 * Met la tentative à jour, ou la crée si elle manque.
 *
 * Le cas « elle manque » n'est pas théorique : si l'ouverture a réussi chez le
 * prestataire mais que notre écriture a échoué juste après, le webhook arrive
 * pour une référence inconnue. Perdre la trace du paiement à ce moment-là
 * serait le pire des deux mondes — l'argent est parti, nous n'en savons rien.
 */
async function majTransaction(orderId: string, evenement: EvenementPaiement): Promise<void> {
  const conclu = estEncaisse(evenement.statut);

  await prisma.paymentTransaction.upsert({
    where: { reference: evenement.reference },
    update: {
      status: evenement.statut,
      rawResponse: evenement.brut,
      completedAt: conclu ? new Date() : null,
    },
    create: {
      orderId,
      provider: PROVIDER,
      reference: evenement.reference,
      amount: evenement.montant,
      currency: DEVISE_PRESTATAIRE,
      status: evenement.statut,
      rawResponse: evenement.brut,
      completedAt: conclu ? new Date() : null,
    },
  });
}

/** Rend la configuration, pour les appelants qui doivent relire une référence. */
export function config(): ConfigGeniusPay | null {
  return lireConfig();
}
