import { cache } from "react";
import { prisma } from "@/server/prisma";
import { getAdminSession } from "@/lib/dal";
import { estRoleConnu, peut, type Capacite, type RoleAdmin } from "@/lib/kk/roles";

/**
 * Le rôle du compte connecté, relu EN BASE à chaque requête.
 *
 * ── POURQUOI PAS DANS LE JETON ──────────────────────────────────────────────
 *
 * Le mettre dans le jeton de session économiserait une requête. Mais un jeton
 * vit plusieurs jours : rétrograder un compte, ou le désactiver, ne prendrait
 * effet qu'à sa prochaine connexion. On révoque un accès parce qu'on veut qu'il
 * cesse maintenant.
 *
 * `cache()` mémoïse la lecture par requête HTTP, comme le fait déjà
 * `getAdminSession` : une requête de base, pas une par vérification.
 */
export const roleCourant = cache(async (): Promise<RoleAdmin | null> => {
  const session = await getAdminSession();
  if (!session?.userId) return null;

  const compte = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: { role: true, active: true },
  });

  // Compte supprimé, désactivé, ou portant un rôle qu'on ne connaît pas : aucun
  // droit. Le drapeau `active` n'était jusqu'ici consulté qu'à la connexion, ce
  // qui laissait un compte désactivé travailler jusqu'à l'expiration de son
  // jeton.
  if (!compte || !compte.active || !estRoleConnu(compte.role)) return null;
  return compte.role;
});

/** Le compte connecté a-t-il cette capacité ? */
export async function aLaCapacite(capacite: Capacite): Promise<boolean> {
  return peut(await roleCourant(), capacite);
}
