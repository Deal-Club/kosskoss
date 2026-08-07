"use client";

import { useSyncExternalStore } from "react";

/**
 * Favoris de la boutique.
 *
 * Deux régimes, un seul magasin :
 *   - **visiteur sans compte** — la liste vit dans le navigateur
 *     (localStorage). Aucun compte n'est nécessaire pour mettre un produit de
 *     côté, et rien n'est envoyé au serveur ;
 *   - **client connecté** — la base fait autorité. La liste locale accumulée
 *     avant la connexion y est versée une fois, puis le stockage du navigateur
 *     est vidé : la sélection suit le client d'un appareil à l'autre.
 *
 * Le régime n'est pas deviné depuis un cookie — celui de session est httpOnly,
 * illisible en JavaScript — mais lu dans le champ `authenticated` que renvoie
 * `GET /api/account/favorites`.
 *
 * Le magasin est un singleton hors React, lu par `useSyncExternalStore` : le
 * rendu serveur part d'une liste vide et le navigateur relit la vraie liste
 * après hydratation, sans écart de balisage ni `setState` dans un effet.
 */

export const FAVORITES_STORAGE_KEY = "kk.favoris.v1";

const ENDPOINT = "/api/account/favorites";

export interface FavoriteItem {
  productId: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  /** Chemin de la fiche produit, préfixe de langue non compris. */
  path: string;
  /** Prix unitaire en FCFA entiers. */
  priceCents: number;
  oldPriceCents?: number;
  /** Stock connu au moment de l'ajout ; recontrôlé côté serveur à la commande. */
  stock: number;
  /** Vrai si le produit se décline : l'ajout au panier passe par la fiche. */
  hasVariants: boolean;
  addedAt: number;
}

/** `unknown` tant que le serveur n'a pas dit si une session est ouverte. */
type Mode = "unknown" | "local" | "account";

export interface FavoritesState {
  items: FavoriteItem[];
  mode: Mode;
  /** false tant que le navigateur n'a pas relu sa liste après hydratation. */
  ready: boolean;
}

type Listener = () => void;

const EMPTY: FavoriteItem[] = [];

/**
 * État complet, remplacé — jamais muté — à chaque changement.
 *
 * `mode` et `ready` vivent dans l'instantané et non à côté : sans cela, passer
 * du régime local au régime compte sur une liste identique ne changerait aucune
 * référence, React ne re-rendrait pas, et l'interface continuerait d'annoncer
 * une liste « enregistrée dans ce navigateur » alors qu'elle est sur le compte.
 */
const INITIAL: FavoritesState = { items: EMPTY, mode: "unknown", ready: false };

let state: FavoritesState = INITIAL;
let syncStarted = false;
let storageListenerAttached = false;
const listeners = new Set<Listener>();

/**
 * Produits retirés par le client avant que le serveur ait répondu.
 *
 * Sans cette mémoire, un retrait fait dans la seconde qui suit l'ouverture de
 * la page serait annulé par la liste du compte qui arrive juste après, et le
 * cœur se rallumerait tout seul.
 */
const removedBeforeSync = new Set<string>();

// ---- Lecture / écriture du navigateur ----

function isItem(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    item.productId.length > 0 &&
    typeof item.name === "string" &&
    typeof item.path === "string"
  );
}

/** Accepte aussi les listes écrites par une version antérieure du format. */
function normalize(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return EMPTY;

  const seen = new Set<string>();
  const items: FavoriteItem[] = [];

  for (const entry of raw) {
    if (!isItem(entry) || seen.has(entry.productId)) continue;
    seen.add(entry.productId);

    // Le garde de type ne contrôle que l'ossature ; les champs facultatifs
    // restent vérifiés un à un, car la donnée vient du navigateur ou de l'API.
    const oldPrice: unknown = entry.oldPriceCents;
    items.push({
      productId: entry.productId,
      slug: typeof entry.slug === "string" ? entry.slug : "",
      brand: typeof entry.brand === "string" ? entry.brand : "",
      name: entry.name,
      image: typeof entry.image === "string" ? entry.image : "",
      path: entry.path,
      priceCents: typeof entry.priceCents === "number" ? entry.priceCents : 0,
      ...(typeof oldPrice === "number" ? { oldPriceCents: oldPrice } : {}),
      stock: typeof entry.stock === "number" ? entry.stock : 0,
      hasVariants: entry.hasVariants === true,
      addedAt: typeof entry.addedAt === "number" ? entry.addedAt : 0,
    });
  }

  // Le plus récemment ajouté apparaît en premier.
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

function readStorage(): FavoriteItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return EMPTY;
    const items = normalize(JSON.parse(raw));
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(items: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    else window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Navigation privée ou quota atteint : la liste reste valable pour la session.
  }
}

function commit(next: Partial<FavoritesState>): void {
  state = { ...state, ...next, ready: true };
  for (const listener of listeners) listener();
}

/** Pose la liste ; le disque n'est écrit qu'en dehors d'une session client. */
function setItems(items: FavoriteItem[]): void {
  const next = items.length > 0 ? items : EMPTY;
  if (state.mode !== "account") writeStorage(next);
  commit({ items: next });
}

/** Relit paresseusement le navigateur au premier accès. */
function currentItems(): FavoriteItem[] {
  if (!state.ready) commit({ items: readStorage() });
  return state.items;
}

// ---- Synchronisation avec le compte ----

/** Vue renvoyée par l'API (`KKFavoriteView`), convertie pour le magasin. */
function fromApi(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  return normalize(
    raw.map((entry) => {
      const e = (entry ?? {}) as Record<string, unknown>;
      return {
        productId: e.productId,
        slug: e.slug,
        brand: e.brand,
        name: e.name,
        image: e.image,
        path: e.path,
        priceCents: e.priceFcfa,
        oldPriceCents: e.oldPriceFcfa,
        stock: e.stock,
        hasVariants: e.hasVariants,
        addedAt: e.addedAt,
      };
    }),
  );
}

async function readApi(response: Response): Promise<FavoriteItem[]> {
  const data = (await response.json()) as { items?: unknown };
  return fromApi(data.items);
}

/** Lecture initiale : la liste, et surtout si une session cliente est ouverte. */
async function readSession(
  response: Response,
): Promise<{ authenticated: boolean; items: FavoriteItem[] }> {
  const data = (await response.json()) as { items?: unknown; authenticated?: unknown };
  return { authenticated: data.authenticated === true, items: fromApi(data.items) };
}

/** Bascule en régime « compte » : la base fait foi, le navigateur est vidé. */
function adoptAccountList(items: FavoriteItem[]): void {
  writeStorage(EMPTY);
  commit({ items: items.length > 0 ? items : EMPTY, mode: "account" });
}

/**
 * Interroge le compte une fois par chargement de page et fusionne s'il y a lieu.
 *
 * Toute panne (hors ligne, 500) laisse le visiteur en régime local : mieux vaut
 * une liste qui reste dans le navigateur qu'une liste qui disparaît.
 */
async function syncWithAccount(): Promise<void> {
  if (syncStarted || typeof window === "undefined") return;
  syncStarted = true;

  try {
    const response = await fetch(ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      commit({ mode: "local" });
      return;
    }

    const session = await readSession(response);
    if (!session.authenticated) {
      // Visiteur sans compte : sa liste reste dans son navigateur.
      commit({ mode: "local" });
      return;
    }

    let items = session.items;
    const local = currentItems();

    // Ce que le navigateur avait et que le compte ignore encore, moins ce que
    // le client vient tout juste de retirer.
    const toMerge = local
      .filter((entry) => !items.some((item) => item.productId === entry.productId))
      .map((entry) => entry.productId)
      .filter((id) => !removedBeforeSync.has(id));

    if (toMerge.length > 0) {
      const merged = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: toMerge }),
      });
      if (merged.ok) items = await readApi(merged);
    }

    // Retraits effectués pendant que la requête était en vol : ils portent sur
    // la liste que le client avait sous les yeux, ils l'emportent.
    for (const productId of removedBeforeSync) {
      if (!items.some((item) => item.productId === productId)) continue;
      const deleted = await fetch(`${ENDPOINT}?productId=${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      if (deleted.ok) items = await readApi(deleted);
    }
    removedBeforeSync.clear();

    adoptAccountList(items);
  } catch {
    commit({ mode: "local" });
  }
}

/** Relit la liste du compte après un appel en échec, pour ne pas rester faux. */
async function refreshFromAccount(): Promise<void> {
  try {
    const response = await fetch(ENDPOINT, { cache: "no-store" });
    if (!response.ok) return;
    const session = await readSession(response);
    // La session a pu expirer entre-temps : on repasse alors au régime local
    // plutôt que d'afficher une liste vide en prétendant qu'elle est au compte.
    if (session.authenticated) adoptAccountList(session.items);
    else commit({ mode: "local" });
  } catch {
    // Hors ligne : la liste affichée reste celle du dernier état connu.
  }
}

/** Écriture sur le compte ; toute réponse rectifie la liste affichée. */
async function pushToAccount(input: string, init?: RequestInit): Promise<void> {
  try {
    const response = await fetch(input, init);
    if (response.ok) {
      adoptAccountList(await readApi(response));
      return;
    }
    await refreshFromAccount();
  } catch {
    await refreshFromAccount();
  }
}

// ---- Abonnement React ----

/** Un autre onglet a modifié la liste locale : on se resynchronise. */
function onStorage(event: StorageEvent): void {
  if (state.mode === "account") return;
  if (event.key !== null && event.key !== FAVORITES_STORAGE_KEY) return;
  commit({ items: readStorage() });
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  if (typeof window !== "undefined") {
    if (!storageListenerAttached) {
      window.addEventListener("storage", onStorage);
      storageListenerAttached = true;
    }
    if (!state.ready) {
      commit({ items: readStorage() });
    }
    void syncWithAccount();
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): FavoritesState {
  return state;
}

/** Le serveur ne connaît pas le navigateur : il rend toujours une liste vide. */
function getServerSnapshot(): FavoritesState {
  return INITIAL;
}

// ---- Actions ----

export function toggleFavorite(item: Omit<FavoriteItem, "addedAt">): void {
  const current = currentItems();
  const exists = current.some((entry) => entry.productId === item.productId);

  // Réponse immédiate au clic ; la requête suit et rectifie si besoin.
  setItems(
    exists
      ? current.filter((entry) => entry.productId !== item.productId)
      : [{ ...item, addedAt: Date.now() }, ...current],
  );

  if (state.mode === "unknown" && exists) removedBeforeSync.add(item.productId);
  if (state.mode !== "account") return;

  void (exists
    ? pushToAccount(`${ENDPOINT}?productId=${encodeURIComponent(item.productId)}`, {
        method: "DELETE",
      })
    : pushToAccount(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId }),
      }));
}

export function removeFavorite(productId: string): void {
  setItems(currentItems().filter((entry) => entry.productId !== productId));

  if (state.mode === "unknown") removedBeforeSync.add(productId);
  if (state.mode !== "account") return;

  void pushToAccount(`${ENDPOINT}?productId=${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}

export function clearFavorites(): void {
  const previous = currentItems();
  setItems([]);

  if (state.mode === "unknown") for (const entry of previous) removedBeforeSync.add(entry.productId);
  if (state.mode !== "account") return;

  void pushToAccount(ENDPOINT, { method: "DELETE" });
}

/**
 * À appeler juste après une connexion réussie.
 *
 * Le module vit dans la page : `router.refresh()` ne le réinitialise pas, il
 * resterait donc en régime local avec un client pourtant connecté. Ce rappel
 * réarme la synchronisation, qui verse au compte les favoris mis de côté avant
 * la connexion.
 */
export function syncFavoritesAfterLogin(): void {
  syncStarted = false;
  commit({ mode: "unknown" });
  void syncWithAccount();
}

/**
 * À appeler juste après une déconnexion.
 *
 * La liste du compte ne doit pas rester affichée pour le visiteur anonyme qui
 * reprend le navigateur — sur un poste partagé, ce serait montrer la sélection
 * de quelqu'un d'autre.
 */
export function resetFavoritesAfterLogout(): void {
  syncStarted = false;
  removedBeforeSync.clear();
  writeStorage(EMPTY);
  commit({ items: EMPTY, mode: "local" });
}

export function useFavorites(): {
  items: FavoriteItem[];
  count: number;
  ready: boolean;
  /** Vrai quand la liste est celle du compte et non celle du navigateur. */
  onAccount: boolean;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    items: snapshot.items,
    count: snapshot.items.length,
    ready: snapshot.ready,
    onAccount: snapshot.mode === "account",
  };
}
