"use client";

import { useSyncExternalStore } from "react";

// Liste de souhaits conservée dans le navigateur, sur le même principe que le
// panier : aucun compte n'est nécessaire pour s'en servir. Le magasin est un
// module singleton lu par useSyncExternalStore, ce qui évite tout écart entre
// le rendu serveur (liste vide) et le rendu client (liste réelle).

export const WISHLIST_STORAGE_KEY = "hgp.wishlist.v1";

export interface WishlistItem {
  productId: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  path: string;
  priceCents: number;
  addedAt: number;
}

type Listener = () => void;

const EMPTY: WishlistItem[] = [];

let snapshot: WishlistItem[] = EMPTY;
let hydrated = false;
let storageListenerAttached = false;
const listeners = new Set<Listener>();

function isItem(value: unknown): value is WishlistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.path === "string"
  );
}

function normalize(raw: unknown): WishlistItem[] {
  if (!Array.isArray(raw)) return EMPTY;

  const seen = new Set<string>();
  const items: WishlistItem[] = [];

  for (const entry of raw) {
    if (!isItem(entry) || seen.has(entry.productId)) continue;
    seen.add(entry.productId);
    items.push({
      productId: entry.productId,
      slug: entry.slug,
      brand: typeof entry.brand === "string" ? entry.brand : "",
      name: entry.name,
      image: typeof entry.image === "string" ? entry.image : "",
      path: entry.path,
      priceCents: typeof entry.priceCents === "number" ? entry.priceCents : 0,
      addedAt: typeof entry.addedAt === "number" ? entry.addedAt : 0,
    });
  }

  // Le plus récemment ajouté apparaît en premier
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

function readStorage(): WishlistItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return EMPTY;
    const items = normalize(JSON.parse(raw));
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
    else window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Navigation privée ou quota atteint : la liste reste valable pour la session.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function setItems(items: WishlistItem[]): void {
  snapshot = items.length > 0 ? items : EMPTY;
  hydrated = true;
  writeStorage(snapshot);
  emit();
}

/** Un autre onglet a modifié la liste : on se resynchronise. */
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== WISHLIST_STORAGE_KEY) return;
  snapshot = readStorage();
  hydrated = true;
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  if (typeof window !== "undefined" && !storageListenerAttached) {
    window.addEventListener("storage", onStorage);
    storageListenerAttached = true;
  }

  if (!hydrated && typeof window !== "undefined") {
    snapshot = readStorage();
    hydrated = true;
    listener();
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): WishlistItem[] {
  return snapshot;
}

/** Le serveur ne connaît pas le navigateur : il rend toujours une liste vide. */
function getServerSnapshot(): WishlistItem[] {
  return EMPTY;
}

export function toggleWishlistItem(item: Omit<WishlistItem, "addedAt">): void {
  const current = hydrated ? snapshot : readStorage();
  const exists = current.some((entry) => entry.productId === item.productId);

  setItems(
    exists
      ? current.filter((entry) => entry.productId !== item.productId)
      : [{ ...item, addedAt: Date.now() }, ...current],
  );
}

export function removeWishlistItem(productId: string): void {
  const current = hydrated ? snapshot : readStorage();
  setItems(current.filter((entry) => entry.productId !== productId));
}

export function clearWishlist(): void {
  setItems([]);
}

export function useWishlist(): { items: WishlistItem[]; count: number; ready: boolean } {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { items, count: items.length, ready: hydrated };
}
