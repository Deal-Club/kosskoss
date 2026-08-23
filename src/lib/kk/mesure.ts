/**
 * Vocabulaire commun de la mesure d'audience : GA4 e-commerce, Meta Pixel et
 * son API de conversions côté serveur (CAPI).
 *
 * ── MODULE PUR, ZÉRO IMPORT ──────────────────────────────────────────────────
 *
 * Ce module sera importé aussi bien du navigateur (balise GA4/Pixel posée en
 * layout) que du serveur (CAPI, déclenchée à l'encaissement). Aucun des deux
 * ne peut tirer Prisma ni `next/headers` : c'est ce qui rend ce fichier pur.
 *
 * ── LA DÉDUPLICATION EST LE CŒUR DU CRITÈRE 20 ───────────────────────────────
 *
 * Le même achat part deux fois : une fois du navigateur (Pixel), une fois du
 * serveur (CAPI). Sans identifiant partagé entre les deux envois, Meta compte
 * la vente deux fois — et rien ne le signale, les chiffres de conversion sont
 * simplement faux.
 *
 * `identifiantEvenement` est donc une fonction PURE de (type, référence) :
 * navigateur et serveur, qui ne se parlent pas au moment de l'envoi, calculent
 * la même chaîne à partir de la même donnée déjà connue des deux côtés — le
 * numéro de commande pour un achat, par exemple. Un identifiant tiré au hasard
 * de chaque côté (`crypto.randomUUID()`, un compteur en mémoire…) romprait
 * cette garantie : c'est précisément le défaut que le critère 20 nomme.
 *
 * ── LE FCFA N'A PAS DE SOUS-UNITÉ ────────────────────────────────────────────
 *
 * Les montants internes portent le suffixe historique « Cents » (hérité de
 * l'époque où la boutique facturait en euros), mais représentent déjà des
 * francs CFA entiers — voir `src/config/brand.ts` (`minorUnit: 0`) et l'appel
 * direct `unit_amount: order.amountCents` dans l'adaptateur Stripe. `montantXaf`
 * ne divise donc jamais par 100 : diviser transformerait 15 000 FCFA en 150.
 */

/** Les quatre événements e-commerce mesurés, du parcours à l'achat. */
export const EVENEMENTS_MESURE = [
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;
export type EvenementMesure = (typeof EVENEMENTS_MESURE)[number];

export function estEvenementMesure(value: unknown): value is EvenementMesure {
  return typeof value === "string" && (EVENEMENTS_MESURE as readonly string[]).includes(value);
}

/**
 * Identifiant partagé entre GA4/Pixel (navigateur) et la CAPI (serveur).
 *
 * Déterministe : mêmes `type` et `reference` → même chaîne, toujours. C'est
 * volontairement une simple concaténation — aucun hachage n'est nécessaire ni
 * souhaitable ici, un hachage ajouterait une dépendance sans rien garantir de
 * plus que la concaténation ne garantit déjà. Le séparateur `:` ne peut pas
 * apparaître dans `type` (un des quatre littéraux fixes ci-dessus) : deux
 * couples différents ne peuvent donc jamais produire la même chaîne, quel que
 * soit le contenu de `reference`.
 */
export function identifiantEvenement(type: EvenementMesure, reference: string): string {
  return `${type}:${reference}`;
}

/** Un article du panier ou de la commande mesurée. */
export interface ArticleMesure {
  /** Référence produit (SKU), utilisée comme identifiant de contenu chez GA4 et Meta. */
  reference: string;
  nom: string;
  /** Prix unitaire, en francs CFA entiers (voir l'en-tête du fichier). */
  prixCents: number;
  quantite: number;
}

/**
 * Ce qu'un événement porte, avant sa mise en forme pour GA4 ou Meta —
 * l'endroit où navigateur et serveur doivent s'accorder sur les mêmes valeurs.
 */
export interface EvenementDetail {
  type: EvenementMesure;
  /**
   * Ce dont dérive `identifiantEvenement` : le numéro de commande pour
   * `purchase`, une référence de panier ou de fiche produit pour les trois
   * autres événements.
   */
  reference: string;
  articles: ArticleMesure[];
  /** Montant total, en francs CFA entiers. */
  totalCents: number;
}

/** Montant en francs CFA entiers — jamais divisé par 100 (voir l'en-tête du fichier). */
export function montantXaf(cents: number): number {
  return Math.round(cents);
}

/** Forme attendue par gtag/GA4 pour un événement e-commerce. */
export interface EvenementGa4 {
  event_id: string;
  value: number;
  currency: "XAF";
  items: { item_id: string; item_name: string; price: number; quantity: number }[];
}

/** Forme attendue par le Pixel Meta (et sa CAPI, identique côté serveur). */
export interface EvenementPixel {
  event_id: string;
  value: number;
  currency: "XAF";
  content_ids: string[];
  content_type: "product";
  contents: { id: string; quantity: number; item_price: number }[];
}

/**
 * `EvenementDetail` → forme GA4.
 *
 * Correspondance (même donnée, deux formes) :
 *   - `event_id`           = `identifiantEvenement(type, reference)`, partagé avec `versPixel`
 *   - `value`, `currency`  = `montantXaf(totalCents)`, `"XAF"` — GA4 nomme ce couple `value`/`currency`
 *   - `items[].item_id`    = `articles[].reference`
 *   - `items[].item_name`  = `articles[].nom`
 *   - `items[].price`      = `montantXaf(articles[].prixCents)`
 *   - `items[].quantity`   = `articles[].quantite`
 */
export function versGa4(evenement: EvenementDetail): EvenementGa4 {
  return {
    event_id: identifiantEvenement(evenement.type, evenement.reference),
    value: montantXaf(evenement.totalCents),
    currency: "XAF",
    items: evenement.articles.map((article) => ({
      item_id: article.reference,
      item_name: article.nom,
      price: montantXaf(article.prixCents),
      quantity: article.quantite,
    })),
  };
}

/**
 * `EvenementDetail` → forme Meta (Pixel navigateur ET CAPI serveur — c'est
 * volontairement la même fonction pour les deux : la CAPI, à venir dans un
 * prochain lot, ne doit pas réinventer sa propre mise en forme sous peine de
 * diverger du Pixel et de casser la déduplication).
 *
 * Correspondance (même donnée que `versGa4`, forme différente) :
 *   - `event_id`              = `identifiantEvenement(type, reference)`, partagé avec `versGa4`
 *   - `value`, `currency`     = `montantXaf(totalCents)`, `"XAF"` — Meta nomme ce couple pareil
 *   - `content_ids`           = `articles[].reference` — l'équivalent Meta de `items[].item_id`
 *   - `contents[].id`         = `articles[].reference`
 *   - `contents[].quantity`   = `articles[].quantite`
 *   - `contents[].item_price` = `montantXaf(articles[].prixCents)`
 */
export function versPixel(evenement: EvenementDetail): EvenementPixel {
  return {
    event_id: identifiantEvenement(evenement.type, evenement.reference),
    value: montantXaf(evenement.totalCents),
    currency: "XAF",
    content_ids: evenement.articles.map((article) => article.reference),
    content_type: "product",
    contents: evenement.articles.map((article) => ({
      id: article.reference,
      quantity: article.quantite,
      item_price: montantXaf(article.prixCents),
    })),
  };
}

/**
 * Vocabulaire d'événements standard de Meta — distinct des quatre littéraux
 * `EvenementMesure` (qui sont ceux de GA4). PARTAGÉ par le Pixel navigateur
 * ET la CAPI serveur, pour la même raison que `versPixel` : les deux envois
 * du même achat doivent porter EXACTEMENT le même nom d'événement, sous peine
 * que Meta les traite comme deux événements différents et ne les déduplique
 * plus malgré un `event_id` identique.
 */
const NOMS_EVENEMENTS_META: Record<EvenementMesure, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

/** Nom Meta standard pour un type d'événement de mesure (Pixel ET CAPI). */
export function nomEvenementMeta(type: EvenementMesure): string {
  return NOMS_EVENEMENTS_META[type];
}
