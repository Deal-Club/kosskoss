/**
 * Pixel d'ouverture des messages de campagne.
 *
 * Le chiffre qui en sort est indicatif, jamais une vérité. Depuis iOS 15, la
 * protection de la vie privée d'Apple Mail précharge les images de tous les
 * messages reçus : une part des « ouvertures » comptées ici n'a jamais été lue
 * par personne. À l'inverse, un client qui bloque les images ouvre sans être
 * compté. Le pilotage se fait sur les clics et les commandes ; le taux
 * d'ouverture ne sert qu'à repérer une chute brutale de délivrabilité.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { recordEvent } from "@/server/campaigns";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

/**
 * GIF transparent de 1×1, écrit en dur plutôt que lu sur le disque : la réponse
 * doit partir sans le moindre accès au système de fichiers, elle est appelée
 * une fois par message ouvert.
 */
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(_request: Request, { params }: { params: Params }) {
  const { token } = await params;

  try {
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { token },
      select: { id: true, campaignId: true, openedAt: true },
    });

    if (recipient && !recipient.openedAt) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { openedAt: new Date() },
      });
      await recordEvent(recipient.campaignId, "ouverture", recipient.id);
    }
  } catch (error) {
    // Une panne de base ne doit pas se voir dans la boîte du client : l'image
    // part quand même, seule la mesure est perdue.
    console.error("[campagne] Ouverture non enregistrée:", error);
  }

  return imageResponse();
}

/**
 * `no-store` est indispensable : mis en cache par un proxy ou par le client de
 * messagerie, le pixel ne serait demandé qu'une fois et les ouvertures
 * suivantes disparaîtraient.
 */
function imageResponse(): NextResponse {
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.byteLength),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
    },
  });
}
