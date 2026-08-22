/**
 * Rôles du back-office et ce que chacun a le droit de faire.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * Le menu (composant client), les gardes serveur et l'écran des comptes lisent
 * tous la même matrice. En la gardant sans dépendance, elle ne peut pas
 * diverger — et rien de serveur n'entre dans le paquet du navigateur.
 *
 * ── L'AUTORISATION SE DIT EN CAPACITÉS, PAS EN ADRESSES ─────────────────────
 *
 * Le back-office compte vingt-six familles de routes. Écrire la règle adresse
 * par adresse garantirait qu'une route ajoutée demain soit oubliée — et une
 * route oubliée est une route ouverte.
 *
 * ── REFUSER PAR DÉFAUT ──────────────────────────────────────────────────────
 *
 * Un rôle inconnu — faute de frappe en base, rôle d'une version future —
 * n'obtient rien. La position sûre est le refus, jamais l'ouverture.
 */

export const ROLES = ["superadmin", "owner", "admin", "gestionnaire"] as const;
export type RoleAdmin = (typeof ROLES)[number];

export const CAPACITES = ["catalogue", "commandes", "contenu", "reglages", "acces"] as const;
export type Capacite = (typeof CAPACITES)[number];

/** Libellés français, pour l'écran des comptes et les messages de refus. */
export const LIBELLES_ROLES: Record<RoleAdmin, string> = {
  superadmin: "Superadmin",
  owner: "Propriétaire",
  admin: "Administrateur",
  gestionnaire: "Gestionnaire de commandes",
};

export const LIBELLES_CAPACITES: Record<Capacite, string> = {
  catalogue: "le catalogue",
  commandes: "les commandes",
  contenu: "les contenus",
  reglages: "les réglages",
  acces: "les comptes",
};

/**
 * La matrice, écrite en toutes lettres.
 *
 * Une matrice explicite se relit ; une matrice déduite de règles s'interprète.
 * Pour une porte de sécurité, la relecture vaut mieux que l'élégance.
 *
 * Le gestionnaire voit les ventes, qui relèvent de `commandes` : suivre les
 * commandes sans voir ce qu'elles rapportent n'aurait pas de sens.
 */
const MATRICE: Record<RoleAdmin, readonly Capacite[]> = {
  superadmin: CAPACITES,
  owner: CAPACITES,
  admin: ["catalogue", "commandes", "contenu", "reglages"],
  gestionnaire: ["commandes"],
};

export function estRoleConnu(valeur: string | undefined | null): valeur is RoleAdmin {
  return typeof valeur === "string" && (ROLES as readonly string[]).includes(valeur);
}

export function capacitesDe(role: string | undefined | null): readonly Capacite[] {
  return estRoleConnu(role) ? MATRICE[role] : [];
}

export function peut(role: string | undefined | null, capacite: Capacite): boolean {
  return capacitesDe(role).includes(capacite);
}
