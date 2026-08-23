/**
 * Quelle capacité protège quelle famille de routes et d'écrans.
 *
 * Le nom de famille est le premier segment après `/admin/` ou `/api/admin/`.
 *
 * ── POURQUOI CETTE CARTE EXISTE ─────────────────────────────────────────────
 *
 * Elle sert de source unique au test d'arborescence : celui-ci parcourt les
 * dossiers et échoue si une famille n'est pas classée ici. Une route ajoutée
 * sans droit déclaré fait donc tomber la suite, au lieu de s'ouvrir en silence.
 */
import type { Capacite } from "./roles";

export const CAPACITE_PAR_FAMILLE: Record<string, Capacite> = {
  // Catalogue
  products: "catalogue",
  "product-tags": "catalogue",
  categories: "catalogue",
  groups: "catalogue",
  brands: "catalogue",
  stock: "catalogue",
  merchant: "catalogue",
  upload: "catalogue",
  "vocabulaire-tags": "catalogue",
  // Approvisionnement : de qui vient la marchandise, et ce qui reste à
  // recevoir. Rattaché au catalogue comme `stock`, dont ce lot est le
  // prolongement — pas aux commandes, qui décrivent ce qu'on vend, pas ce
  // qu'on achète.
  suppliers: "catalogue",
  "purchase-orders": "catalogue",
  // Import du master client (fiches produits + routines) — voir
  // src/server/kk/master.ts et docs/HANDOVER.md.
  "master-import": "catalogue",

  // Commandes — y compris les ventes : suivre les commandes sans voir ce
  // qu'elles rapportent n'aurait pas de sens.
  orders: "commandes",
  customers: "commandes",
  reviews: "commandes",
  ventes: "commandes",

  // Contenu
  journal: "contenu",
  pages: "contenu",
  announcements: "contenu",
  campaigns: "contenu",
  scripts: "contenu",
  traductions: "contenu",

  // Réglages — y compris les moyens de paiement : virement et passerelles en
  // ligne sont des réglages de paiement, pas des commandes.
  parametres: "reglages",
  integrations: "reglages",
  "payment-gateway": "reglages",
  "payment-methods": "reglages",
  "bank-transfer": "reglages",
  payments: "reglages",
  coupons: "reglages",
  diagnostic: "reglages",
  "diagnostic-steps": "reglages",

  // Comptes
  users: "acces",
};

/**
 * Les seules familles qui précèdent par nature toute session.
 *
 * Cette liste est une exception nommée, pas une échappatoire : y ajouter une
 * famille revient à ouvrir une porte, et doit se justifier dans le même
 * mouvement.
 */
export const FAMILLES_SANS_SESSION = ["login", "logout", "refuse"] as const;

export function capaciteDeFamille(nom: string): Capacite | null {
  return CAPACITE_PAR_FAMILLE[nom] ?? null;
}
