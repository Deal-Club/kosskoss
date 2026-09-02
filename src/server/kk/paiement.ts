import { prisma } from "@/server/prisma";
import * as geniuspay from "@/server/gateways/geniuspay";
import * as cinetpay from "@/server/gateways/cinetpay";
import { getOrderByNumber, recordOrderEvent, updatePaymentStatus } from "@/server/orders";
import { envoyerAchatCapi } from "@/server/kk/capi";
import { identifiantProduitCatalogue } from "@/lib/kk/mesure";

/**
 * Paiement d'une commande KossKoss, via CinetPay ou GeniusPay.
 *
 * Ce module tient les deux moitiés du cycle : ouvrir une tentative de paiement,
 * et conclure quand le prestataire nous rappelle.
 *
 * ── UNE RÈGLE QUI GOUVERNE TOUT ─────────────────────────────────────────────
 *
 * Une commande ne passe JAMAIS en « payée » depuis le retour navigateur du
 * client. Ce retour prouve seulement qu'un onglet s'est rouvert — pas qu'un
 * franc a été encaissé. Seuls le webhook signé (ou, pour CinetPay, une
 * relecture serveur-à-serveur systématique — voir gateways/cinetpay.ts) font
 * autorité. C'est écrit noir sur blanc dans le cahier des charges (docs/13
 * §5.2) et c'est la faute la plus coûteuse qu'un tunnel de paiement puisse
 * commettre.
 *
 * ── CINETPAY SEUL, GENIUSPAY DÉBRANCHÉ SUR DEMANDE CLIENT ───────────────────
 *
 * CinetPay est recommandé par le cahier des charges et couvre XAF + Cameroun
 * (voir docs/ETAT-DES-LIEUX.md §4). `gateways/geniuspay.ts` reste dans le
 * dépôt (code éprouvé, pourrait redevenir un repli un jour) mais
 * `fournisseurActif` ne le regarde plus : demande explicite du client, un
 * paiement de test avait redirigé vers GeniusPay pendant que CinetPay était
 * encore bloqué par la liste blanche IP côté CinetPay — un repli silencieux
 * vers un second prestataire configuré est justement le genre de surprise
 * qu'on ne veut pas sur un tunnel de paiement. Tant que CinetPay échoue
 * (IP non autorisée, jeton refusé…), le tunnel retombe sur la confirmation
 * manuelle par WhatsApp — jamais sur GeniusPay à l'insu de quiconque.
 * `PaymentTransaction.provider` garde le nom du prestataire par lequel
 * chaque tentative est réellement passée.
 */

type Provider = { nom: "cinetpay"; config: cinetpay.ConfigCinetPay };

/** Prestataire actif — CinetPay uniquement, voir la note ci-dessus. */
function fournisseurActif(): Provider | null {
  const cp = cinetpay.lireConfig();
  return cp ? { nom: "cinetpay", config: cp } : null;
}

/** La passerelle est-elle configurée ? Sinon le tunnel reste en manuel. */
export function paiementDisponible(): boolean {
  return fournisseurActif() !== null;
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
  const fournisseur = fournisseurActif();
  if (!fournisseur) return null;

  const commande = await getOrderByNumber(orderNumber);
  if (!commande) return null;

  // Le français vit à la racine, l'anglais sous /en (localePrefix « as-needed »).
  const prefixe = commande.locale === "en" ? "/en" : "";
  const urlSucces = `${urlBase}${prefixe}/confirmation/${commande.orderNumber}`;
  const urlEchec = `${urlBase}${prefixe}/commande?paiement=echec`;
  const client = {
    // Le nom vit sur l'adresse de facturation : la commande n'en porte pas en
    // propre.
    nom: `${commande.billing.firstName} ${commande.billing.lastName}`.trim(),
    email: commande.email,
    telephone: commande.phone,
  };

  // `transaction_id` CinetPay DOIT être unique par tentative — contrairement
  // à GeniusPay, qui délivre sa propre référence opaque, c'est nous qui la
  // choisissons ici. Le numéro de commande sert de base ; une reprise après
  // échec (nouvel appel pour la même commande) ajoute un suffixe `R<n>`,
  // jamais un caractère qui pourrait apparaître dans un vrai numéro de
  // commande (`KK-AAAA-NNNNNN`, uniquement chiffres après le second tiret) —
  // c'est ce qui permet de retrouver la commande sans ambiguïté depuis le
  // webhook (voir `commandeDepuisReferenceCinetpay`).
  //
  // ── AUCUN JETON DANS L'URL CONFIÉE AU PRESTATAIRE ───────────────────────
  //
  // La page de confirmation demande une preuve d'accès, sans quoi n'importe
  // qui lirait la commande de n'importe qui à partir de son seul numéro.
  // Cette preuve a d'abord été mise ici, en `?t=<accessToken>` — et c'était
  // une faute : le prestataire ENREGISTRE cette URL chez lui, elle apparaît
  // dans ses réponses d'API et dans ses journaux, puis elle se dépose dans
  // l'historique du navigateur et dans l'en-tête `Referer` des requêtes
  // suivantes. Un jeton de consultation n'a rien à faire dans tout cela.
  //
  // Le jeton voyage désormais dans un cookie `httpOnly` posé au moment de la
  // commande (voir la route /api/kk/checkout). Le retour de paiement est une
  // navigation de premier niveau : un cookie `SameSite=Lax` est donc bien
  // transmis, et le prestataire ne voit qu'une adresse nue.
  //
  // Le préfixe de langue suit la commande : un acheteur venu de /en doit
  // revenir sur /en, pas basculer en français au retour du paiement.
  const tentatives = await prisma.paymentTransaction.count({
    where: { orderId: commande.id, provider: "cinetpay" },
  });
  const transactionId = tentatives === 0 ? commande.orderNumber : `${commande.orderNumber}R${tentatives + 1}`;

  const resultat = await cinetpay.creerPaiement(fournisseur.config, {
    montant: commande.totalCents,
    description: `Commande ${commande.orderNumber}`,
    orderNumber: transactionId,
    client,
    urlSucces,
    urlEchec,
    urlNotification: `${urlBase}/api/payments/webhook/cinetpay`,
  });
  const paiement = { ...resultat, frais: 0, net: resultat.montant };

  await prisma.paymentTransaction.create({
    data: {
      orderId: commande.id,
      provider: fournisseur.nom,
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
    `Paiement ouvert chez ${fournisseur.nom} (${paiement.environnement}) — référence ${paiement.reference}`,
  );

  return { urlPaiement: paiement.urlPaiement, reference: paiement.reference };
}

/**
 * Numéro de commande depuis une référence CinetPay — l'inverse du suffixe
 * `R<n>` posé à l'ouverture. Une référence sans suffixe EST déjà le numéro de
 * commande (première tentative).
 */
export function commandeDepuisReferenceCinetpay(transactionId: string): string {
  return transactionId.replace(/R\d+$/, "");
}

// ---- Conclusion depuis un webhook ----

export interface EvenementPaiement {
  /** Lequel des deux prestataires a émis l'événement — détermine le
   *  vocabulaire de statut lu par `estEncaisse`/`estEchoue` ("completed" chez
   *  GeniusPay, "ACCEPTED" chez CinetPay, entre autres divergences. */
  provider: "cinetpay" | "geniuspay";
  /** Référence de transaction chez le prestataire. */
  reference: string;
  /** Statut brut : completed, failed, cancelled… (GeniusPay) ou
   *  ACCEPTED/REFUSED… (CinetPay). */
  statut: string;
  /** Montant annoncé par le prestataire, pour recoupement. */
  montant: number;
  /** Numéro de commande, transmis dans `metadata.order_id` (GeniusPay) ou
   *  retrouvé via `commandeDepuisReferenceCinetpay` (CinetPay). */
  orderNumber: string;
  /** Corps brut, archivé. */
  brut: string;
}

function estEncaisse(evenement: Pick<EvenementPaiement, "provider" | "statut">): boolean {
  return evenement.provider === "cinetpay"
    ? cinetpay.estEncaisse(evenement.statut)
    : geniuspay.estEncaisse(evenement.statut);
}

function estEchoue(evenement: Pick<EvenementPaiement, "provider" | "statut">): boolean {
  return evenement.provider === "cinetpay"
    ? cinetpay.estEchoue(evenement.statut)
    : geniuspay.estEchoue(evenement.statut);
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

  // ── Idempotence propre à CinetPay ─────────────────────────────────────────
  // GeniusPay est protégé en amont par le verrou sur `WebhookEvent.deliveryId`
  // (voir la route de webhook correspondante). CinetPay n'offre aucun
  // identifiant de livraison stable — sa documentation dit explicitement que
  // `notify_url` peut être appelée PLUSIEURS FOIS pour le même paiement — donc
  // le verrou se pose ici : si cette transaction est DÉJÀ dans l'état encaissé
  // qu'annonce l'événement, les effets de bord (mail, statut, CAPI) ne sont
  // pas rejoués une deuxième fois.
  if (estEncaisse(evenement)) {
    const existante = await prisma.paymentTransaction.findUnique({
      where: { reference: evenement.reference },
      select: { status: true },
    });
    if (existante && estEncaisse({ provider: evenement.provider, statut: existante.status })) {
      return "encaisse";
    }
  }

  // ── Recoupement du montant ────────────────────────────────────────────────
  // La signature garantit que le message vient bien du prestataire, pas que le
  // montant corresponde à la commande. Un écart signale une erreur de
  // configuration ou une manipulation : on refuse d'encaisser et on laisse la
  // commande en attente, à vérifier à la main. Mieux vaut un règlement à
  // contrôler qu'une commande expédiée pour un dixième de son prix.
  if (estEncaisse(evenement) && evenement.montant !== commande.totalCents) {
    await recordOrderEvent(
      commande.id,
      "paiement",
      `⚠️ Montant incohérent : ${evenement.montant} FCFA reçus pour une commande de ${commande.totalCents} FCFA (référence ${evenement.reference}). Paiement NON validé, à vérifier.`,
    );
    return "montant_incoherent";
  }

  await majTransaction(commande.id, evenement);

  if (estEncaisse(evenement)) {
    // `updatePaymentStatus` porte le statut de PAIEMENT ; le statut de
    // COMMANDE suit séparément, car une commande payée n'est pas encore
    // préparée.
    await updatePaymentStatus(commande.id, "payee", evenement.provider, `Référence ${evenement.reference}`);
    await prisma.order.update({
      where: { id: commande.id },
      data: { status: "payee" },
    });

    // CAPI Meta (critère 20) : l'ENCAISSEMENT est la conversion, pas la
    // commande — c'est pourquoi cet appel vit ICI et nulle part ailleurs, dans
    // le seul point de passage qui fait passer une commande en « payée » (voir
    // l'en-tête du fichier). N'envoie rien sans consentement marketing figé à
    // la commande, ni sans identifiant/jeton CAPI configurés — voir
    // `src/server/kk/capi.ts`. `await`ée : une erreur y est toujours avalée,
    // jamais laissée remonter jusqu'ici (même fichier, même garantie).
    await envoyerAchatCapi({
      orderNumber: commande.orderNumber,
      email: commande.email,
      phone: commande.phone,
      totalCents: commande.totalCents,
      marketingConsent: commande.marketingConsent,
      // Référence ALIGNÉE SUR LE FLUX GOOGLE MERCHANT (voir
      // `identifiantProduitCatalogue`), même repli qu'à la page de confirmation
      // (MesureAchat, côté navigateur) : slug, puis identifiant produit, puis
      // nom — la seule valeur garantie non vide sur toute ligne de commande
      // (colonne `slug` ajoutée après coup, produit parfois supprimé depuis).
      articles: commande.items.map((item) => ({
        reference: identifiantProduitCatalogue(item.slug, item.productId || item.name),
        nom: item.name,
        prixCents: item.unitPriceCents,
        quantite: item.quantity,
      })),
    });

    return "encaisse";
  }

  if (estEchoue(evenement)) {
    await updatePaymentStatus(commande.id, "echouee", evenement.provider, `Référence ${evenement.reference}`);
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
  const conclu = estEncaisse(evenement);
  const devise = evenement.provider === "cinetpay" ? cinetpay.DEVISE_PRESTATAIRE : geniuspay.DEVISE_PRESTATAIRE;

  await prisma.paymentTransaction.upsert({
    where: { reference: evenement.reference },
    update: {
      status: evenement.statut,
      rawResponse: evenement.brut,
      completedAt: conclu ? new Date() : null,
    },
    create: {
      orderId,
      provider: evenement.provider,
      reference: evenement.reference,
      amount: evenement.montant,
      currency: devise,
      status: evenement.statut,
      rawResponse: evenement.brut,
      completedAt: conclu ? new Date() : null,
    },
  });
}
