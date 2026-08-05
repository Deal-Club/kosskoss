/**
 * Base de contacts des campagnes.
 *
 * La boutique n'a pas de table « contact » et n'en aura pas. Les adresses
 * existent déjà, dans les comptes clients d'un côté et dans les commandes
 * invité de l'autre ; les recopier dans une troisième table créerait un fichier
 * qui vieillit mal — une adresse corrigée dans le compte resterait fausse dans
 * la liste d'envoi — et un traitement de plus à porter au registre. Les deux
 * sources sont donc lues à la volée et réunies ici.
 *
 * Le compte prime sur la commande invité pour une même adresse : ses données
 * sont tenues à jour par le client lui-même, celles d'une commande sont figées
 * au jour où elle a été passée.
 *
 * Le rapprochement se fait en mémoire, pas en base : `mode: "insensitive"` de
 * Prisma est ignoré par SQLite, et la boutique tourne sur SQLite en local comme
 * sur PostgreSQL en ligne. Comparer les adresses en minuscules côté Node donne
 * le même résultat sur les deux moteurs.
 */

import { prisma } from "@/server/prisma";
import type { CampaignLocale } from "@/lib/campaigns";

export interface Contact {
  /** Toujours en minuscules : c'est la clé de rapprochement des deux sources. */
  email: string;
  firstName: string;
  lastName: string;
  locale: CampaignLocale;
  customerId: string | null;
  source: "compte" | "invite";
  orderCount: number;
  lastOrderAt: Date | null;
  /** Présent dans EmailSuppression : ne doit plus recevoir de message commercial. */
  unsubscribed: boolean;
}

/** Motifs de blocage acceptés, alignés sur le commentaire du modèle Prisma. */
export type SuppressionReason = "desinscription" | "rejet" | "plainte";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLocale(value: string): CampaignLocale {
  return value === "en" ? "en" : "fr";
}

/** Statistiques de commande accumulées pour une même personne. */
interface OrderStats {
  count: number;
  lastAt: Date;
  firstName: string;
  lastName: string;
  locale: CampaignLocale;
}

/**
 * Toutes les adresses connues de la boutique, dédoublonnées.
 *
 * Trois requêtes, quelle que soit la taille de la liste : les comptes, les
 * commandes, la liste de blocage. Le reste est de l'agrégation en mémoire — une
 * requête par contact rendrait l'écran des destinataires inutilisable dès
 * quelques centaines d'adresses.
 */
export async function listContacts(): Promise<Contact[]> {
  const [customers, orders, suppressions] = await Promise.all([
    prisma.customer.findMany({
      // Un compte désactivé ne reçoit plus rien : il l'a été soit à la demande
      // du client, soit par le back-office.
      where: { active: true },
      select: { id: true, email: true, firstName: true, lastName: true, locale: true },
    }),
    prisma.order.findMany({
      // Les commandes anonymisées portent une adresse de remplacement
      // (compte supprimé) : les démarcher reviendrait à écrire dans le vide.
      where: { anonymizedAt: null },
      // Ordre croissant : la dernière écriture dans les tables ci-dessous est
      // donc toujours celle de la commande la plus récente, c'est elle qui
      // donne le nom et la langue retenus.
      orderBy: { createdAt: "asc" },
      select: {
        email: true,
        customerId: true,
        locale: true,
        billingFirstName: true,
        billingLastName: true,
        createdAt: true,
      },
    }),
    prisma.emailSuppression.findMany({ select: { email: true } }),
  ]);

  const blocked = new Set(suppressions.map((row) => normalizeEmail(row.email)));

  // Deux accumulateurs : les commandes rattachées à un compte sont comptées sur
  // le compte, les autres sur l'adresse. Une commande passée avec un compte
  // n'est donc jamais comptée deux fois si l'adresse de facturation diffère.
  const byCustomer = new Map<string, OrderStats>();
  const byGuestEmail = new Map<string, OrderStats>();

  for (const order of orders) {
    const stats: OrderStats = {
      count: 0,
      lastAt: order.createdAt,
      firstName: order.billingFirstName,
      lastName: order.billingLastName,
      locale: normalizeLocale(order.locale),
    };

    if (order.customerId) {
      const previous = byCustomer.get(order.customerId);
      byCustomer.set(order.customerId, { ...stats, count: (previous?.count ?? 0) + 1 });
      continue;
    }

    const email = normalizeEmail(order.email);
    if (!email) continue;
    const previous = byGuestEmail.get(email);
    byGuestEmail.set(email, { ...stats, count: (previous?.count ?? 0) + 1 });
  }

  const contacts = new Map<string, Contact>();

  for (const customer of customers) {
    const email = normalizeEmail(customer.email);
    if (!email) continue;
    const stats = byCustomer.get(customer.id);

    contacts.set(email, {
      email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      locale: normalizeLocale(customer.locale),
      customerId: customer.id,
      source: "compte",
      orderCount: stats?.count ?? 0,
      lastOrderAt: stats?.lastAt ?? null,
      unsubscribed: blocked.has(email),
    });
  }

  for (const [email, stats] of byGuestEmail) {
    // Le compte l'emporte : ses coordonnées sont à jour, pas celles d'une
    // ancienne commande.
    if (contacts.has(email)) continue;

    contacts.set(email, {
      email,
      firstName: stats.firstName,
      lastName: stats.lastName,
      locale: stats.locale,
      customerId: null,
      source: "invite",
      orderCount: stats.count,
      lastOrderAt: stats.lastAt,
      unsubscribed: blocked.has(email),
    });
  }

  // Les acheteurs récents d'abord : c'est la sélection la plus fréquente au
  // moment de choisir des destinataires. Les comptes sans commande ferment la
  // marche, dans l'ordre alphabétique pour que la liste reste stable d'un
  // affichage à l'autre.
  return [...contacts.values()].sort((a, b) => {
    const left = a.lastOrderAt?.getTime() ?? -1;
    const right = b.lastOrderAt?.getTime() ?? -1;
    if (left !== right) return right - left;
    return a.email.localeCompare(b.email);
  });
}

/** L'adresse figure-t-elle sur la liste de blocage ? */
export async function isSuppressed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const row = await prisma.emailSuppression.findUnique({
    where: { email: normalized },
    select: { email: true },
  });
  return row !== null;
}

/**
 * Inscrit une adresse sur la liste de blocage.
 *
 * L'écriture est idempotente : un client qui clique deux fois sur le lien de
 * désinscription ne doit pas voir d'erreur. La date de première inscription est
 * conservée telle quelle — c'est elle qui prouve à quel moment la demande a été
 * honorée — mais le motif est rafraîchi : une plainte pour spam arrivée après
 * une simple désinscription est l'information qui compte pour la réputation du
 * domaine.
 */
export async function suppressEmail(
  email: string,
  reason: string,
  campaignId?: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const motive = reason.trim().slice(0, 40) || "desinscription";

  await prisma.emailSuppression.upsert({
    where: { email: normalized },
    // Sans campagne connue, l'origine déjà enregistrée est laissée en place
    // plutôt que remplacée par une valeur vide.
    update: { reason: motive, ...(campaignId ? { campaignId } : {}) },
    create: { email: normalized, reason: motive, campaignId: campaignId ?? null },
  });
}
