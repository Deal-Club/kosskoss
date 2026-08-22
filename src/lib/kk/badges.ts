import type { KKBadge } from "@/types/kk";

/**
 * LES BADGES PRODUIT — source unique.
 *
 * Deux distinctions, pas davantage : « Meilleure vente » et « Nouveauté ».
 * Elles se posent à la main, produit par produit, depuis le back-office.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────
 * Le badge était un champ de TEXTE LIBRE au back-office (« ex. -20%,
 * Nouveau »), alors que la boutique n'affiche que deux valeurs, écrites en
 * minuscules et sans accent : `bestseller` et `nouveau`. Tout le reste — un
 * « Nouveau » avec sa majuscule, un « -20% », une faute de frappe — était
 * enregistré sans broncher puis ignoré à l'affichage. Le badge ne sortait
 * jamais, et rien ne disait pourquoi.
 *
 * Les clés, les libellés et la reconnaissance des saisies vivent donc ici, et
 * les quatre endroits qui en avaient besoin s'y branchent : le formulaire
 * d'administration, la validation côté serveur, les vignettes et la fiche.
 *
 * ── Ce que la clé n'est pas ───────────────────────────────────────────────
 * Ce n'est pas un libellé. `bestseller` est ce qu'on écrit en base ;
 * « Meilleure vente » est ce que lit un client. Les deux ne se confondent
 * jamais — c'est ce qui permet de retoucher le second sans migration.
 */

export interface BadgeDefinition {
  /** Valeur stockée en base. Ne se traduit pas, ne s'affiche pas. */
  key: Exclude<KKBadge, null>;
  /** Ce que lit le client, sur la vignette comme sur la fiche. */
  label: string;
  /** Aide à la décision, affichée sous le choix au back-office. */
  hint: string;
}

export const PRODUCT_BADGES: readonly BadgeDefinition[] = [
  {
    key: "bestseller",
    label: "Meilleure vente",
    hint: "Le produit qui part le plus dans son rayon.",
  },
  {
    key: "nouveau",
    label: "Nouveauté",
    hint: "Arrivé récemment au catalogue.",
  },
] as const;

/**
 * Clé → libellé client, dans les deux langues de la boutique.
 *
 * Même convention que `ORDER_STATUS_LABELS` (src/lib/orderStatus.ts) et que
 * `Besoin.label`/`labelEn` (src/lib/kk/besoins.ts) : une valeur bilingue
 * portée par ce module, plutôt qu'une clé next-intl. Ces trois fichiers ne
 * dépendent ni de Prisma ni du serveur — badges, statuts et besoins doivent
 * rester importables depuis le bundle du navigateur comme depuis le
 * back-office — et c'est ce qui les distingue des messages next-intl, qui
 * exigent un contexte de requête.
 */
export const BADGE_LABEL: Record<Exclude<KKBadge, null>, { en: string; fr: string }> = {
  bestseller: { en: "Bestseller", fr: "Meilleure vente" },
  nouveau: { en: "New", fr: "Nouveauté" },
};

/**
 * Saisies acceptées pour chaque clé, au-delà de la clé elle-même.
 *
 * Elles servent l'IMPORT CSV, où la colonne « badge » est remplie à la main
 * dans un tableur : « Nouveau », « NOUVEAUTÉ », « best seller », « meilleure
 * vente » désignent tous quelque chose de connu, et les refuser au motif que
 * la casse diffère ferait perdre la colonne entière sans le dire.
 *
 * La comparaison se fait sur une forme réduite — minuscules, accents retirés,
 * séparateurs supprimés — d'où l'absence de variantes accentuées dans cette
 * table : « nouveaute » couvre déjà « Nouveauté ».
 */
const ALIAS: Record<Exclude<KKBadge, null>, readonly string[]> = {
  bestseller: ["bestseller", "meilleurevente", "meilleuresventes", "topvente", "topventes"],
  nouveau: ["nouveau", "nouveaute", "nouveautes", "new", "nouvelle"],
};

/** Minuscules, sans accent, sans espace ni tiret : « Best-Seller » → « bestseller ». */
function reduire(value: string): string {
  return value
    .normalize("NFD")
    // Les diacritiques combinants, décrochés par NFD : é → e + U+0301.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Ramène une saisie quelconque à une clé connue, ou à `null`.
 *
 * `null` couvre les trois cas où le produit ne porte pas de badge : le champ
 * est vide, il vaut autre chose que les deux distinctions prévues (« -20 % »,
 * qui relève des promotions et non du badge), ou il est absent.
 */
export function normaliserBadge(value: string | null | undefined): KKBadge {
  if (!value) return null;
  const reduit = reduire(value);
  if (!reduit) return null;

  for (const { key } of PRODUCT_BADGES) {
    if (ALIAS[key].includes(reduit)) return key;
  }
  return null;
}
