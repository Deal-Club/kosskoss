/**
 * Jetons de sécurité rendus par un prestataire à l'ouverture d'un paiement.
 *
 * Module volontairement minuscule et sans autre dépendance que Prisma : les
 * adaptateurs de paiement s'en servent sans passer par @/server/orders, ce qui
 * évite un cycle d'imports entre la couche commandes et la couche prestataires.
 *
 * Seul Nexi en a l'usage — ses notifications ne sont pas signées, elles rejouent
 * le jeton remis à la création, qu'on compare à celui conservé ici.
 */

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/prisma";

export async function setOrderSecurityToken(orderNumber: string, token: string): Promise<void> {
  const value = token.trim();
  if (!value) return;
  await prisma.order.update({
    where: { orderNumber },
    data: { gatewaySecurityToken: value },
  });
}

/**
 * Vrai si le jeton présenté est bien celui remis pour cette commande.
 *
 * Comparaison à temps constant : le jeton fait office de signature, une
 * comparaison naïve laisserait fuiter sa valeur caractère par caractère.
 */
export async function matchesOrderSecurityToken(
  orderNumber: string,
  presented: string,
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { gatewaySecurityToken: true },
  });

  const expected = order?.gatewaySecurityToken;
  if (!expected || !presented) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  // timingSafeEqual exige des longueurs égales : une longueur différente est
  // déjà un rejet, et la révéler n'apprend rien d'exploitable.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
