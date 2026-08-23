import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { dejaMesure, marquerMesure, PREFIXE_STOCKAGE } from "./mesure-achat";

/**
 * Tests de la garde persistante — voir l'en-tête de `mesure-achat.tsx`.
 *
 * `useRef` seul empêche un second envoi au double montage du Strict Mode,
 * mais disparaît avec le composant : ces tests vérifient que la garde survit
 * à un « rechargement » simulé (un second appel indépendant, comme le serait
 * un nouveau montage après `F5`), pas seulement à un second appel dans la
 * MÊME exécution — c'est précisément ce qu'un `useRef` ne peut pas garantir
 * et que `localStorage` garantit.
 */

// ── FAUX NAVIGATEUR ──────────────────────────────────────────────────────────
// Pas de jsdom dans ce projet (voir `mesureNavigateur.test.ts`) : un
// `localStorage` minimal, adossé à une `Map`, suffit à ce que `dejaMesure`/
// `marquerMesure` utilisent réellement.

function poserFauxLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const fauxLocalStorage = {
    getItem: (cle: string) => (store.has(cle) ? (store.get(cle) as string) : null),
    setItem: (cle: string, valeur: string) => {
      store.set(cle, valeur);
    },
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: fauxLocalStorage };
  return store;
}

function retirerFauxNavigateur(): void {
  delete (globalThis as unknown as { window?: unknown }).window;
}

afterEach(() => {
  retirerFauxNavigateur();
});

describe("dejaMesure / marquerMesure hors navigateur", () => {
  it("dejaMesure rend false quand `window` n'existe pas", () => {
    assert.equal(dejaMesure("KOSS-2026-000123"), false);
  });

  it("marquerMesure ne lève pas quand `window` n'existe pas", () => {
    assert.doesNotThrow(() => marquerMesure("KOSS-2026-000123"));
  });
});

describe("dejaMesure / marquerMesure — la garde survit au rechargement", () => {
  it("rend false pour une commande jamais marquée", () => {
    poserFauxLocalStorage();
    assert.equal(dejaMesure("KOSS-2026-000123"), false);
  });

  it("rend true pour cette commande après l'avoir marquée — même après un « rechargement » simulé (nouvel appel indépendant sur le même stockage)", () => {
    const store = poserFauxLocalStorage();
    assert.equal(dejaMesure("KOSS-2026-000123"), false, "pas encore marquée");

    marquerMesure("KOSS-2026-000123");
    assert.equal(store.get(`${PREFIXE_STOCKAGE}KOSS-2026-000123`), "1");

    // Un « rechargement » ne fait rien d'autre, ici, qu'un second appel
    // indépendant sur le MÊME stockage persistant — ce qu'un `useRef` ne
    // pourrait pas simuler puisqu'il disparaîtrait avec le composant.
    assert.equal(dejaMesure("KOSS-2026-000123"), true);
  });

  it("ne marque PAS une autre commande — la garde est bornée au numéro de commande, jamais un drapeau global", () => {
    poserFauxLocalStorage();
    marquerMesure("KOSS-2026-000123");
    assert.equal(dejaMesure("KOSS-2026-000124"), false, "une autre commande doit rester mesurable");
  });

  it("ne lève pas si le stockage est indisponible (navigation privée stricte, quota dépassé…)", () => {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("stockage indisponible");
        },
        setItem: () => {
          throw new Error("stockage indisponible");
        },
      },
    };
    assert.doesNotThrow(() => dejaMesure("KOSS-2026-000123"));
    assert.equal(dejaMesure("KOSS-2026-000123"), false);
    assert.doesNotThrow(() => marquerMesure("KOSS-2026-000123"));
  });
});
