import { cartLineKey } from "@/lib/variantPricing";

// Panier de la boutique.
//
// Ce module est volontairement isolé de React : il contient les constantes
// tarifaires, les calculs de montants — repris tels quels côté serveur dans
// src/server/orders.ts — et un petit magasin persisté dans localStorage que
// CartProvider branche sur React via useSyncExternalStore.
//
// Aucune directive "use client" ici : le serveur importe les constantes et les
// fonctions de calcul, jamais le magasin (protégé par un test sur `window`).

/** Clé localStorage, versionnée pour pouvoir invalider un ancien format. */
export const CART_STORAGE_KEY = "mlc.cart.v1";

/**
 * Taux de TVA appliqué, en points de pourcentage.
 *
 * Fixé à 0 : la TVA a été retirée du système. Les prix affichés sont les prix
 * réglés, sans décomposition hors taxe / taxe. `taxCents` vaut donc toujours 0
 * et aucune ligne de TVA n'apparaît sur la facture, les e-mails ou le panier.
 */
export const VAT_RATE_PERCENT = 0;

// ---- Modes de livraison ----
//
// Deux modes, et deux seulement. Le standard est gratuit sans montant minimum
// d'achat : il n'y a donc plus de franco de port à atteindre, et plus aucune
// mention « encore X € pour la livraison gratuite » à afficher.
//
// Les tarifs et les délais vivent ici, en un seul endroit : le serveur les relit
// pour facturer (src/server/orders.ts), la boutique les affiche, et le flux
// Google Merchant les déclare (src/server/merchant.ts). Un écart entre ces trois
// endroits constitue une pratique commerciale trompeuse au sens de l'article
// L121-2 du Code de la consommation.

export const SHIPPING_METHODS = [
  {
    key: "standard",
    /** Gratuit, sans minimum d'achat. */
    cents: 0,
    minDays: 3,
    maxDays: 5,
    /** Libellé archivé sur la commande, en français comme le moyen de paiement. */
    label: "Livraison standard",
  },
  {
    key: "express",
    /** 60,00 € — supplément de service, soumis à la TVA comme la marchandise. */
    cents: 6_000,
    minDays: 1,
    maxDays: 2,
    label: "Livraison express",
  },
] as const;

export type ShippingMethod = (typeof SHIPPING_METHODS)[number];
export type ShippingMethodKey = ShippingMethod["key"];

/** Mode retenu quand le client n'a rien choisi, et pour toute valeur inconnue. */
export const DEFAULT_SHIPPING_METHOD_KEY: ShippingMethodKey = "standard";

export function isShippingMethodKey(value: unknown): value is ShippingMethodKey {
  return typeof value === "string" && SHIPPING_METHODS.some((method) => method.key === value);
}

/**
 * Mode de livraison correspondant à la clé. Une clé inconnue rend le standard
 * plutôt que de lever : le serveur revalide de toute façon la valeur reçue, et
 * une commande ne doit pas échouer sur un champ que le client peut omettre.
 */
export function shippingMethodFor(key: unknown): ShippingMethod {
  return (
    SHIPPING_METHODS.find((method) => method.key === key) ??
    SHIPPING_METHODS.find((method) => method.key === DEFAULT_SHIPPING_METHOD_KEY)!
  );
}

/** Frais réellement dus pour un mode de livraison, en centimes. */
export function shippingCostFor(key: unknown): number {
  return shippingMethodFor(key).cents;
}

/** Garde-fou : au-delà, il s'agit d'une commande professionnelle à traiter à part. */
export const MAX_QUANTITY_PER_LINE = 20;

/** Nombre maximal de lignes distinctes dans un panier. */
export const MAX_CART_LINES = 40;

export interface CartLine {
  /** Identifiant du produit en base — seule donnée à laquelle le serveur se fie. */
  productId: string;
  /** Variation choisie (volume) ; absente pour un produit simple. */
  variantId?: string;
  variantLabel?: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  /** Chemin de la fiche produit, par ex. « /buches/hetre/hetre-33-palette ». */
  path: string;
  /** Prix unitaire TTC en centimes, instantané au moment de l'ajout. */
  priceCents: number;
  quantity: number;
  /** Stock connu au moment de l'ajout ; recontrôlé côté serveur à la commande. */
  stock: number;
}

export interface CartTotals {
  /** Nombre d'articles, quantités comprises. */
  itemCount: number;
  /** Marchandise TTC. */
  subtotalCents: number;
  /** Mode de livraison retenu pour ce calcul. */
  shippingMethodKey: ShippingMethodKey;
  shippingCents: number;
  /** TVA *contenue* dans le total, jamais un supplément. */
  taxCents: number;
  totalCents: number;
}

// ---- Calculs ----

/**
 * Formatage identique à `formatPrice` de src/server/store.ts, mais utilisable
 * dans un composant client : ce module n'importe pas Prisma.
 * Le format reste français dans les deux langues, comme partout dans la
 * boutique — c'est un magasin français, les prix sont en euros.
 */
export function formatCents(cents: number): string {
  return `${(cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/**
 * Part de TVA comprise dans un montant TTC.
 * Les prix affichés sont TTC (article L112-1 du Code de la consommation), la
 * TVA se déduit donc du total : TTC × 10 / 110.
 */
export function includedVatCents(grossCents: number, ratePercent = VAT_RATE_PERCENT): number {
  if (grossCents <= 0) return 0;
  return Math.round((grossCents * ratePercent) / (100 + ratePercent));
}

export interface TotalsOptions {
  /**
   * Mode de livraison choisi par le client. Absent, c'est le standard —
   * gratuit — qui s'applique : le panier et le tiroir latéral affichent donc le
   * montant le plus bas tant que le client n'a rien choisi dans le tunnel.
   */
  shippingMethodKey?: ShippingMethodKey;
  /**
   * Livraison offerte accordée par une campagne marketing.
   *
   * N'a plus d'effet sur le montant depuis que le standard est gratuit sans
   * minimum d'achat, et ne couvre volontairement pas le supplément express :
   * l'express est un service facturé 60 €, qu'une campagne promotionnelle
   * n'offre pas. Le paramètre reste accepté pour que les campagnes en cours
   * continuent de fonctionner et de s'afficher.
   */
  freeShipping?: boolean;
}

/**
 * Le paramètre `options` est facultatif : tous les appels qui ne connaissent pas
 * le mode de livraison continuent de fonctionner et obtiennent le standard.
 */
export function computeTotals(
  lines: readonly CartLine[],
  options?: TotalsOptions,
): CartTotals {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  const method = shippingMethodFor(options?.shippingMethodKey ?? DEFAULT_SHIPPING_METHOD_KEY);
  // Un panier vide ne facture rien, pas même l'express : le client n'a encore
  // rien commandé.
  const shippingCents = subtotalCents > 0 ? method.cents : 0;
  const totalCents = subtotalCents + shippingCents;

  return {
    itemCount,
    subtotalCents,
    shippingMethodKey: method.key,
    shippingCents,
    taxCents: includedVatCents(totalCents),
    totalCents,
  };
}

export function clampQuantity(quantity: number, stock: number): number {
  const upperBound = Math.min(MAX_QUANTITY_PER_LINE, stock > 0 ? stock : MAX_QUANTITY_PER_LINE);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(Math.max(1, Math.floor(quantity)), Math.max(1, upperBound));
}

// ---- Magasin persisté ----

type Listener = () => void;

/**
 * Instantané rendu par le serveur : toujours le même objet, sans quoi React
 * boucle à l'infini et l'hydratation diverge.
 */
const EMPTY_LINES: readonly CartLine[] = Object.freeze([]);

let snapshot: readonly CartLine[] = EMPTY_LINES;
let hydrated = false;
const listeners = new Set<Listener>();

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === "string" &&
    line.productId.length > 0 &&
    typeof line.priceCents === "number" &&
    Number.isFinite(line.priceCents) &&
    typeof line.quantity === "number" &&
    Number.isFinite(line.quantity)
  );
}

function normalize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];

  const lines: CartLine[] = [];
  for (const entry of raw) {
    if (!isCartLine(entry)) continue;
    // variantId/variantLabel are optional in CartLine; read them directly after the type guard.
    const entryVariantId = typeof entry.variantId === "string" ? entry.variantId : undefined;
    const entryVariantLabel = typeof entry.variantLabel === "string" ? entry.variantLabel : undefined;
    if (lines.some((line) => cartLineKey(line.productId, line.variantId) === cartLineKey(entry.productId, entryVariantId))) continue;

    lines.push({
      productId: entry.productId,
      ...(entryVariantId !== undefined ? { variantId: entryVariantId } : {}),
      ...(entryVariantLabel !== undefined ? { variantLabel: entryVariantLabel } : {}),
      slug: typeof entry.slug === "string" ? entry.slug : "",
      brand: typeof entry.brand === "string" ? entry.brand : "",
      name: typeof entry.name === "string" ? entry.name : "",
      image: typeof entry.image === "string" ? entry.image : "",
      path: typeof entry.path === "string" ? entry.path : "",
      priceCents: Math.max(0, Math.round(entry.priceCents)),
      stock: typeof entry.stock === "number" && Number.isFinite(entry.stock) ? entry.stock : 0,
      quantity: clampQuantity(entry.quantity, entry.stock ?? 0),
    });

    if (lines.length >= MAX_CART_LINES) break;
  }
  return lines;
}

function readStorage(): readonly CartLine[] {
  if (typeof window === "undefined") return EMPTY_LINES;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_LINES;
    const lines = normalize(JSON.parse(raw));
    return lines.length > 0 ? lines : EMPTY_LINES;
  } catch {
    return EMPTY_LINES;
  }
}

function writeStorage(lines: readonly CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    if (lines.length === 0) window.localStorage.removeItem(CART_STORAGE_KEY);
    else window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Mode privé ou quota atteint : le panier reste valable pour la session.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(lines: readonly CartLine[]): void {
  snapshot = lines.length > 0 ? lines : EMPTY_LINES;
  hydrated = true;
  writeStorage(snapshot);
  emit();
}

/** Instantané client : lu paresseusement une seule fois, puis stable par référence. */
export function getCartSnapshot(): readonly CartLine[] {
  if (!hydrated) {
    snapshot = readStorage();
    hydrated = true;
  }
  return snapshot;
}

/** Instantané utilisé au rendu serveur et pendant l'hydratation : panier vide. */
export function getCartServerSnapshot(): readonly CartLine[] {
  return EMPTY_LINES;
}

// Un panier modifié dans un autre onglet doit se refléter ici. Le gestionnaire
// est unique et posé une seule fois, quel que soit le nombre d'abonnés React.
let storageListenerAttached = false;

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  snapshot = readStorage();
  hydrated = true;
  emit();
}

export function subscribeCart(listener: Listener): () => void {
  listeners.add(listener);

  if (typeof window !== "undefined" && !storageListenerAttached) {
    window.addEventListener("storage", onStorage);
    storageListenerAttached = true;
  }

  return () => {
    listeners.delete(listener);
  };
}

export function addToCart(line: Omit<CartLine, "quantity">, quantity = 1): void {
  const current = getCartSnapshot();
  const key = cartLineKey(line.productId, line.variantId);
  const existing = current.find((entry) => cartLineKey(entry.productId, entry.variantId) === key);

  if (existing) {
    commit(
      current.map((entry) =>
        cartLineKey(entry.productId, entry.variantId) === key
          ? {
              ...entry,
              // Le prix et le stock sont rafraîchis à chaque ajout
              ...line,
              quantity: clampQuantity(entry.quantity + quantity, line.stock),
            }
          : entry,
      ),
    );
    return;
  }

  if (current.length >= MAX_CART_LINES) return;
  commit([...current, { ...line, quantity: clampQuantity(quantity, line.stock) }]);
}

export function setCartQuantity(productId: string, variantId: string | undefined, quantity: number): void {
  const key = cartLineKey(productId, variantId);
  if (quantity <= 0) {
    removeFromCart(productId, variantId);
    return;
  }
  commit(
    getCartSnapshot().map((entry) =>
      cartLineKey(entry.productId, entry.variantId) === key
        ? { ...entry, quantity: clampQuantity(quantity, entry.stock) }
        : entry,
    ),
  );
}

export function removeFromCart(productId: string, variantId?: string): void {
  const key = cartLineKey(productId, variantId);
  commit(getCartSnapshot().filter((entry) => cartLineKey(entry.productId, entry.variantId) !== key));
}

export function clearCart(): void {
  commit([]);
}

/**
 * Remplace le panier par une version revalidée côté serveur (prix, stock,
 * disponibilité). Ne notifie que si quelque chose a réellement changé, pour ne
 * pas déclencher de rendu inutile.
 */
export function replaceCart(lines: readonly CartLine[]): void {
  const current = getCartSnapshot();
  const next = normalize(lines);
  if (JSON.stringify(current) === JSON.stringify(next)) return;
  commit(next);
}
