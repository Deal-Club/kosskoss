import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVENEMENTS_MESURE } from "./mesure";
import { initialiserMesure, mesurerEvenement, nomEvenementMeta } from "./mesureNavigateur";

// Exécuté par `node --test`, sans DOM : `window` et `document` n'existent pas
// dans cet environnement. C'est exactement le cas qu'un rendu serveur (ou tout
// script qui importerait ce module par erreur hors navigateur) rencontrerait
// aussi — les fonctions ci-dessous doivent donc rester silencieuses plutôt que
// de lever `ReferenceError: window is not defined`.

describe("nomEvenementMeta", () => {
  it("traduit les quatre littéraux GA4 vers le vocabulaire Meta", () => {
    assert.equal(nomEvenementMeta("view_item"), "ViewContent");
    assert.equal(nomEvenementMeta("add_to_cart"), "AddToCart");
    assert.equal(nomEvenementMeta("begin_checkout"), "InitiateCheckout");
    assert.equal(nomEvenementMeta("purchase"), "Purchase");
  });

  it("couvre les quatre événements de mesure, sans en oublier un", () => {
    for (const type of EVENEMENTS_MESURE) {
      assert.equal(typeof nomEvenementMeta(type), "string");
    }
  });
});

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
