import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialiserMesure, mesurerEvenement } from "./mesureNavigateur";

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
