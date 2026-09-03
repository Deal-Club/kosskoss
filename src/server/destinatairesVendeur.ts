import { prisma } from "@/server/prisma";
import { SUPERADMIN_ROLE } from "@/server/admins";

/**
 * À qui la boutique adresse ses notifications de commande.
 *
 * Extrait de `orderNotifications.ts`, où cette logique servait la route
 * `/api/checkout` — celle de la lignée précédente, aujourd'hui sans appelant.
 * Le tunnel vivant (`/api/kk/checkout` → `server/kk/checkout.ts`) en a besoin
 * lui aussi, et l'importer depuis l'ancien module y ferait entrer toute sa
 * chaîne de dépendances (facture PDF, virement bancaire, gabarits d'e-mails
 * hérités) pour trois lignes de configuration. D'où ce module à part, dont les
 * deux chemins dépendent également.
 */

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
export async function sellerRecipients(): Promise<string[]> {
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
    console.error("[commande] Lecture des comptes back-office impossible :", error);
  }

  return [...addresses];
}
