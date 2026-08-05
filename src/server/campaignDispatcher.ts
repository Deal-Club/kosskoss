/**
 * Répartiteur d'envoi des campagnes.
 *
 * Un seul principe gouverne ce fichier : l'envoi ne doit jamais être régulier.
 * Ni la taille des lots ni la durée des pauses ne sont fixes, elles sont tirées
 * au hasard à chaque passage entre les bornes de la campagne. Un expéditeur qui
 * envoie exactement dix messages toutes les cinq minutes dessine une signature
 * que les filtres de réputation (Google Postmaster, Microsoft SNDS) repèrent
 * immédiatement : le domaine est classé automate, les messages partent en
 * indésirables, et la réputation se répare en semaines. Un rythme irrégulier
 * ressemble à un envoi humain et coûte seulement quelques minutes de plus.
 *
 * Deuxième principe : rien ne doit pouvoir figer une campagne. Le verrou est
 * pris par une écriture conditionnelle, il expire tout seul au bout de dix
 * minutes si le serveur tombe en plein lot, et il est relâché dans un `finally`.
 * Un échec d'envoi, lui, n'interrompt jamais le lot — une seule adresse morte
 * bloquerait sinon toute la file derrière elle.
 *
 * Le module est appelé par une tâche planifiée ou par une route d'entretien ;
 * il ne dépend d'aucun contexte de requête.
 */

import { prisma } from "@/server/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { pickBatchSize, pickDelaySeconds, type CampaignLocale } from "@/lib/campaigns";
import { buildCampaignEmail } from "@/server/emails/campaign";
import { getCampaign, recordEvent, type CampaignDetail } from "@/server/campaigns";

export interface DispatchReport {
  campaignId: string;
  sent: number;
  failed: number;
  /** Destinataires encore en attente après ce lot. */
  remaining: number;
  /** Heure du lot suivant, ou null quand la campagne est terminée. */
  nextBatchAt: Date | null;
  completed: boolean;
}

/**
 * Durée au-delà de laquelle un verrou est considéré comme abandonné.
 *
 * Dix minutes : un lot de cinquante messages ne prend jamais autant, mais un
 * serveur arrêté en plein envoi laisserait sinon `dispatchingAt` posé pour
 * toujours et la campagne ne repartirait plus jamais.
 */
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

/** Longueur maximale d'un motif d'échec conservé en base. */
const ERROR_MAX_LENGTH = 300;

/**
 * Traite toutes les campagnes dont l'heure du prochain lot est passée.
 *
 * Séquentiel à dessein : deux campagnes servies en parallèle enverraient deux
 * lots au même instant depuis le même domaine, ce que toute la cadence
 * irrégulière cherche justement à éviter.
 */
export async function dispatchDueCampaigns(): Promise<DispatchReport[]> {
  const due = await prisma.campaign.findMany({
    where: { status: "en_cours", nextBatchAt: { not: null, lte: new Date() } },
    orderBy: { nextBatchAt: "asc" },
    select: { id: true },
  });

  const reports: DispatchReport[] = [];
  for (const campaign of due) {
    const report = await dispatchCampaign(campaign.id);
    if (report) reports.push(report);
  }
  return reports;
}

/**
 * Traite un lot d'une campagne précise.
 *
 * Renvoie `undefined` quand il n'y a rien à faire : campagne inconnue, en
 * brouillon, en pause, annulée, ou déjà servie par un autre passage.
 */
export async function dispatchCampaign(campaignId: string): Promise<DispatchReport | undefined> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return undefined;

  // Une campagne en pause, annulée ou encore en brouillon n'est jamais traitée.
  if (campaign.status !== "en_cours") return undefined;

  if (!isMailConfigured()) {
    // Sortie propre : marquer toute la file en échec parce qu'une variable
    // d'environnement manque effacerait une liste qu'il faudrait reconstruire à
    // la main. La campagne reste en l'état et repartira une fois la clé posée.
    const remaining = await countPending(campaignId);
    console.warn(
      `[campagne ${campaign.code}] Aucun fournisseur d'e-mail configuré : ${remaining} envoi(s) en attente.`,
    );
    return {
      campaignId,
      sent: 0,
      failed: 0,
      remaining,
      nextBatchAt: campaign.nextBatchAt,
      completed: false,
    };
  }

  // Prise du verrou : écriture conditionnelle, donc atomique. Si aucune ligne
  // n'est touchée, un autre passage travaille déjà sur cette campagne — ou le
  // statut vient de changer entre la lecture ci-dessus et maintenant.
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const lock = await prisma.campaign.updateMany({
    where: {
      id: campaignId,
      status: "en_cours",
      OR: [{ dispatchingAt: null }, { dispatchingAt: { lt: staleBefore } }],
    },
    data: { dispatchingAt: now },
  });
  if (lock.count === 0) return undefined;

  try {
    return await runBatch(campaign);
  } finally {
    // Toujours relâché : un verrou oublié gèle la campagne jusqu'à expiration.
    // `updateMany` plutôt que `update` pour ne pas lever d'erreur si la
    // campagne a été supprimée entre-temps.
    await prisma.campaign
      .updateMany({ where: { id: campaignId }, data: { dispatchingAt: null } })
      .catch((error: unknown) => {
        console.error(`[campagne ${campaign.code}] Verrou non relâché :`, error);
      });
  }
}

/** La langue est stockée en texte libre : tout ce qui n'est pas « en » est français. */
function toLocale(value: string): CampaignLocale {
  return value === "en" ? "en" : "fr";
}

function countPending(campaignId: string): Promise<number> {
  return prisma.campaignRecipient.count({
    where: { campaignId, status: "en_attente" },
  });
}

async function runBatch(campaign: CampaignDetail): Promise<DispatchReport> {
  const campaignId = campaign.id;
  const size = pickBatchSize(campaign.batchMin, campaign.batchMax);

  const batch = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "en_attente" },
    // Aucun horodatage de création sur la file : l'identifiant cuid commence
    // par un composant temporel, l'ordre croissant suit donc l'ordre d'entrée.
    orderBy: { id: "asc" },
    take: size,
    select: { id: true, email: true, firstName: true, locale: true, token: true },
  });

  // Une désinscription arrivée depuis une autre campagne doit être respectée
  // ici aussi : la liste de blocage est globale, elle est donc relue au moment
  // d'envoyer et pas seulement au lancement.
  const suppressions = await prisma.emailSuppression.findMany({
    where: { email: { in: batch.map((recipient) => recipient.email) } },
    select: { email: true },
  });
  const blocked = new Set(suppressions.map((row) => row.email.toLowerCase()));

  let sent = 0;
  let failed = 0;

  for (const recipient of batch) {
    if (blocked.has(recipient.email.toLowerCase())) {
      await markIgnored(campaignId, recipient.id);
      continue;
    }

    try {
      const message = buildCampaignEmail({
        campaign,
        products: campaign.products,
        recipient: {
          token: recipient.token,
          firstName: recipient.firstName,
          locale: toLocale(recipient.locale),
        },
      });

      await sendMail({ to: recipient.email, ...message });
      await markSent(campaignId, recipient.id);
      sent += 1;
    } catch (error) {
      const reason = (error instanceof Error ? error.message : String(error)).slice(
        0,
        ERROR_MAX_LENGTH,
      );
      await markFailed(campaignId, recipient.id, reason);
      failed += 1;
    }
  }

  const remaining = await countPending(campaignId);

  if (remaining === 0) {
    // Écriture conditionnelle : si la campagne a été mise en pause ou annulée
    // pendant le lot, elle ne doit pas ressusciter en « envoyée ».
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: "en_cours" },
      data: { status: "envoyee", completedAt: new Date(), nextBatchAt: null },
    });
    return { campaignId, sent, failed, remaining: 0, nextBatchAt: null, completed: true };
  }

  const delaySeconds = pickDelaySeconds(campaign.delayMinSec, campaign.delayMaxSec);
  const nextBatchAt = new Date(Date.now() + delaySeconds * 1000);

  await prisma.campaign.updateMany({
    where: { id: campaignId, status: "en_cours" },
    data: { nextBatchAt },
  });

  return { campaignId, sent, failed, remaining, nextBatchAt, completed: false };
}

/**
 * Les trois fonctions ci-dessous avalent leurs propres erreurs.
 *
 * Une écriture qui échoue après un envoi réussi est ennuyeuse — le message
 * repartira au prochain lot — mais elle ne doit surtout pas faire tomber la
 * boucle : le reste du lot, lui, partirait alors deux fois.
 */
async function markSent(campaignId: string, recipientId: string): Promise<void> {
  try {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "envoye", sentAt: new Date(), error: "" },
    });
    await recordEvent(campaignId, "envoi", recipientId);
  } catch (error) {
    console.error(`[campagne] Statut « envoyé » non enregistré (${recipientId}) :`, error);
  }
}

async function markFailed(
  campaignId: string,
  recipientId: string,
  reason: string,
): Promise<void> {
  try {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "echec", error: reason },
    });
    await recordEvent(campaignId, "echec", recipientId, reason);
  } catch (error) {
    console.error(`[campagne] Statut « échec » non enregistré (${recipientId}) :`, error);
  }
}

async function markIgnored(campaignId: string, recipientId: string): Promise<void> {
  try {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "ignore", error: "desinscription" },
    });
    await recordEvent(campaignId, "desinscription", recipientId, "adresse sur la liste de blocage");
  } catch (error) {
    console.error(`[campagne] Statut « ignoré » non enregistré (${recipientId}) :`, error);
  }
}
