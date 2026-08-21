import { prisma } from "@/server/prisma";
import { ecrireReponses, lireReponses } from "@/lib/kk/profil-reponses";

/**
 * Profil Diagnostic du client connecté.
 *
 * Best-effort des deux côtés : ni l'enregistrement ni la relecture ne doivent
 * empêcher le diagnostic de fonctionner. Un visiteur venu faire son QCM se
 * moque de savoir que sa session a expiré ; il veut sa routine.
 */

export async function enregistrerProfil(customerId: string, answerIds: string[]): Promise<void> {
  try {
    await prisma.customerDiagProfile.upsert({
      where: { customerId },
      update: { answerIds: ecrireReponses(answerIds) },
      create: { customerId, answerIds: ecrireReponses(answerIds) },
    });
  } catch (error) {
    // Journaliser sans relancer : le résultat du diagnostic est déjà calculé et
    // affiché, échouer ici le ferait disparaître pour rien.
    console.error("[profil-diagnostic] enregistrement échoué", { customerId, error });
  }
}

export async function lireProfil(customerId: string): Promise<string[]> {
  try {
    const ligne = await prisma.customerDiagProfile.findUnique({
      where: { customerId },
      select: { answerIds: true },
    });
    return lireReponses(ligne?.answerIds ?? null);
  } catch {
    return [];
  }
}
