"use client";

import { useSyncExternalStore } from "react";

// Historique de consultation, propre à l'onglet en cours : sessionStorage et
// non localStorage, volontairement — « les produits vus pendant cette visite »
// n'a plus de sens si la liste survit à la fermeture de l'onglet. Même
// principe de magasin singleton que le panier et la liste de souhaits.

export const RECENTLY_VIEWED_STORAGE_KEY = "mlc.vus.v1";

// Au-delà, l'historique n'a plus d'utilité pratique : ni le popup de sortie ni
// la page dédiée n'en montrent jamais autant d'un coup.
const MAX_ENTRIES = 12;

export interface RecentlyViewedItem {
  productId: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  path: string;
  priceCents: number;
  /** Nombre de consultations pendant la session — sert à définir le « top ». */
  viewCount: number;
  lastViewedAt: number;
}

type Listener = () => void;

const EMPTY: RecentlyViewedItem[] = [];

let snapshot: RecentlyViewedItem[] = EMPTY;
let hydrated = false;
const listeners = new Set<Listener>();

function isItem(value: unknown): value is RecentlyViewedItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.path === "string"
  );
}

function normalize(raw: unknown): RecentlyViewedItem[] {
  if (!Array.isArray(raw)) return EMPTY;

  const seen = new Set<string>();
  const items: RecentlyViewedItem[] = [];

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
      viewCount: typeof entry.viewCount === "number" ? entry.viewCount : 1,
      lastViewedAt: typeof entry.lastViewedAt === "number" ? entry.lastViewedAt : 0,
    });
  }

  // Le plus consulté d'abord ; à égalité, le plus récent.
  return items.sort((a, b) => b.viewCount - a.viewCount || b.lastViewedAt - a.lastViewedAt);
}

function readStorage(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) return EMPTY;
    const items = normalize(JSON.parse(raw));
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(items: RecentlyViewedItem[]): void {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) window.sessionStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
    else window.sessionStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Navigation privée ou quota atteint : l'historique reste valable pour l'onglet en cours.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function setItems(items: RecentlyViewedItem[]): void {
  snapshot = items.length > 0 ? items : EMPTY;
  hydrated = true;
  writeStorage(snapshot);
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  if (!hydrated && typeof window !== "undefined") {
    snapshot = readStorage();
    hydrated = true;
    listener();
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RecentlyViewedItem[] {
  return snapshot;
}

/** Le serveur ne connaît pas l'onglet du visiteur : il rend toujours une liste vide. */
function getServerSnapshot(): RecentlyViewedItem[] {
  return EMPTY;
}

/** Note la consultation d'une fiche produit. Rappeler avec le même identifiant incrémente le compteur au lieu de dupliquer l'entrée. */
export function recordProductView(item: Omit<RecentlyViewedItem, "viewCount" | "lastViewedAt">): void {
  const current = hydrated ? snapshot : readStorage();
  const existing = current.find((entry) => entry.productId === item.productId);
  const rest = current.filter((entry) => entry.productId !== item.productId);

  const updated: RecentlyViewedItem = {
    ...item,
    viewCount: (existing?.viewCount ?? 0) + 1,
    lastViewedAt: Date.now(),
  };

  setItems(normalize([updated, ...rest]).slice(0, MAX_ENTRIES));
}

export function useRecentlyViewed(): { items: RecentlyViewedItem[]; ready: boolean } {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { items, ready: hydrated };
}
