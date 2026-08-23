import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  initialiserMesure,
  mesurerEvenement,
  _reinitialiserPourLesTests,
} from "./mesureNavigateur";
import { CONSENT_COOKIE } from "@/lib/consent";

// Exécuté par `node --test`, sans DOM : `window` et `document` n'existent pas
// dans cet environnement. C'est exactement le cas qu'un rendu serveur (ou tout
// script qui importerait ce module par erreur hors navigateur) rencontrerait
// aussi — les fonctions ci-dessous doivent donc rester silencieuses plutôt que
// de lever `ReferenceError: window is not defined`.
//
// `nomEvenementMeta` a migré vers `mesure.ts` (partagé avec la CAPI serveur,
// voir la tâche 4) : ses tests vivent désormais dans `mesure.test.ts`.

describe("initialiserMesure hors navigateur", () => {
  it("ne lève pas quand `window` n'existe pas", () => {
    assert.doesNotThrow(() => initialiserMesure({ ga4Id: "G-ABCDEF1234", metaPixelId: "1234567890" }));
  });

  it("ne lève pas non plus quand les identifiants sont vides", () => {
    assert.doesNotThrow(() => initialiserMesure({ ga4Id: "", metaPixelId: "" }));
  });
});

describe("mesurerEvenement hors navigateur", () => {
  it("ne lève pas et n'envoie rien quand `window` n'existe pas", () => {
    assert.doesNotThrow(() =>
      mesurerEvenement({
        type: "purchase",
        reference: "KOSS-2026-000123",
        articles: [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 2 }],
        totalCents: 19000,
      }),
    );
  });
});

// ── LA GARDE DE CONSENTEMENT, PAS SEULEMENT L'ABSENCE DE NAVIGATEUR ─────────
//
// Les tests ci-dessus prouvent que rien ne lève hors navigateur — mais ils ne
// prouvent PAS que `mesurerEvenement`/`initialiserMesure` refusent d'agir sans
// consentement : sans `window`, `fbq`/`gtag` ne sont de toute façon jamais
// définis, garde ou pas. Un faux navigateur minimal (pas de dépendance jsdom
// dans ce projet) est donc posé ci-dessous pour observer ce que le module fait
// RÉELLEMENT de `window.fbq`/`window.gtag` selon le cookie de consentement —
// de sorte qu'un test tombe si `consentementAutorise` était un jour forcé à
// toujours répondre « oui ».

type FauxScript = { async?: boolean; src?: string };

interface FauxNavigateur {
  window: Record<string, unknown>;
  document: { cookie: string; createElement: (tag: string) => FauxScript; head: { appendChild: (n: FauxScript) => void } };
}

function poserFauxNavigateur(cookie: string): FauxNavigateur {
  const fauxWindow: Record<string, unknown> = {};
  const fauxDocument = {
    cookie,
    createElement: (_tag: string): FauxScript => ({}),
    head: { appendChild: (_n: FauxScript): void => {} },
  };
  (globalThis as unknown as { window: unknown }).window = fauxWindow;
  (globalThis as unknown as { document: unknown }).document = fauxDocument;
  return { window: fauxWindow, document: fauxDocument };
}

function retirerFauxNavigateur(): void {
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { document?: unknown }).document;
  _reinitialiserPourLesTests();
}

/** Cookie de consentement valide, au format `version.mesure.marketing.horodatage` — voir `@/lib/consent`. */
function cookieConsentement(mesure: boolean, marketing: boolean): string {
  const horodatage = Math.floor(Date.now() / 1000);
  return `${CONSENT_COOKIE}=1.${mesure ? "1" : "0"}.${marketing ? "1" : "0"}.${horodatage}`;
}

afterEach(() => {
  // Filet de sécurité si un test échoue avant son propre nettoyage : jamais de
  // faux navigateur qui traîne pour le test suivant.
  retirerFauxNavigateur();
});

describe("mesurerEvenement — garde du Pixel Meta sur la catégorie « marketing »", () => {
  it("NE POSE PAS `window.fbq` et n'envoie rien sans consentement marketing", () => {
    const { window } = poserFauxNavigateur(cookieConsentement(true, false));
    try {
      initialiserMesure({ ga4Id: "", metaPixelId: "1234567890" });
      assert.equal(window.fbq, undefined, "le Pixel ne doit pas se charger sans consentement marketing");

      mesurerEvenement({
        type: "add_to_cart",
        reference: "SKU-1",
        articles: [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 1 }],
        totalCents: 9500,
      });
      assert.equal(window.fbq, undefined, "mesurerEvenement ne doit pas charger le Pixel a posteriori");
    } finally {
      retirerFauxNavigateur();
    }
  });

  it("pose `window.fbq` et lui fait porter l'événement quand le consentement marketing est accordé", () => {
    const { window } = poserFauxNavigateur(cookieConsentement(false, true));
    try {
      initialiserMesure({ ga4Id: "", metaPixelId: "1234567890" });
      const fbq = window.fbq as { queue: unknown[][] } | undefined;
      assert.equal(typeof fbq, "function", "le Pixel doit se charger avec consentement marketing");
      assert.equal(fbq?.queue.length, 1, "l'appel `fbq('init', id)` doit être en file");

      mesurerEvenement({
        type: "add_to_cart",
        reference: "SKU-1",
        articles: [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 1 }],
        totalCents: 9500,
      });
      assert.equal(fbq?.queue.length, 2, "l'événement `track` doit s'ajouter à la file");
      const [, nomEvenement] = fbq?.queue[1] as [string, string];
      assert.equal(nomEvenement, "AddToCart");
    } finally {
      retirerFauxNavigateur();
    }
  });
});

describe("mesurerEvenement — garde de GA4 sur la catégorie « mesure »", () => {
  it("NE POSE PAS `window.gtag` et n'envoie rien sans consentement de mesure", () => {
    const { window } = poserFauxNavigateur(cookieConsentement(false, true));
    try {
      initialiserMesure({ ga4Id: "G-ABCDEF1234", metaPixelId: "" });
      assert.equal(window.gtag, undefined, "GA4 ne doit pas se charger sans consentement de mesure");

      mesurerEvenement({
        type: "view_item",
        reference: "SKU-1",
        articles: [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 1 }],
        totalCents: 9500,
      });
      assert.equal(window.gtag, undefined);
    } finally {
      retirerFauxNavigateur();
    }
  });

  it("pose `window.gtag` et lui fait porter l'événement quand le consentement de mesure est accordé", () => {
    const { window } = poserFauxNavigateur(cookieConsentement(true, false));
    try {
      initialiserMesure({ ga4Id: "G-ABCDEF1234", metaPixelId: "" });
      assert.equal(typeof window.gtag, "function", "GA4 doit se charger avec consentement de mesure");

      const dataLayer = window.dataLayer as unknown[][];
      const avant = dataLayer.length;
      mesurerEvenement({
        type: "view_item",
        reference: "SKU-1",
        articles: [{ reference: "SKU-1", nom: "Bûches", prixCents: 9500, quantite: 1 }],
        totalCents: 9500,
      });
      assert.equal(dataLayer.length, avant + 1, "l'événement doit atteindre le dataLayer");
      const [nomAppel, nomEvenement] = dataLayer[dataLayer.length - 1] as [string, string];
      assert.equal(nomAppel, "event");
      assert.equal(nomEvenement, "view_item");
    } finally {
      retirerFauxNavigateur();
    }
  });
});
