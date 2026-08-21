import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gestesActifs, libelleGeste, type GesteLigne } from "./gestes-selection";

function geste(over: Partial<GesteLigne> = {}): GesteLigne {
  return {
    key: "nettoyer",
    labelFr: "Nettoyer",
    labelEn: "Cleanse",
    category: "nettoyants",
    position: 0,
    active: true,
    ...over,
  };
}

describe("gestesActifs", () => {
  it("trie par position croissante", () => {
    const rendu = gestesActifs([
      geste({ key: "hydrater", position: 2 }),
      geste({ key: "nettoyer", position: 0 }),
      geste({ key: "traiter", position: 1 }),
    ]);
    assert.deepEqual(rendu.map((g) => g.key), ["nettoyer", "traiter", "hydrater"]);
  });

  it("écarte les gestes désactivés", () => {
    // Désactiver « Protéger » doit donner une routine de trois gestes, pas une
    // routine de quatre dont un est vide.
    const rendu = gestesActifs([
      geste({ key: "nettoyer", position: 0 }),
      geste({ key: "proteger", position: 1, active: false }),
    ]);
    assert.deepEqual(rendu.map((g) => g.key), ["nettoyer"]);
  });

  it("rend une liste vide quand tout est désactivé", () => {
    // Cas limite réel : le client peut tout décocher. La routine doit être
    // vide, pas planter.
    assert.deepEqual(gestesActifs([geste({ active: false })]), []);
  });

  it("ne modifie pas le tableau reçu", () => {
    // Le tri en place casserait l'appelant, qui garde sa liste complète pour
    // l'écran d'administration.
    const source = [geste({ key: "b", position: 1 }), geste({ key: "a", position: 0 })];
    gestesActifs(source);
    assert.deepEqual(source.map((g) => g.key), ["b", "a"]);
  });
});

describe("libelleGeste", () => {
  it("rend le libellé français par défaut", () => {
    assert.equal(libelleGeste(geste(), "fr"), "Nettoyer");
  });

  it("rend le libellé anglais sur /en", () => {
    assert.equal(libelleGeste(geste(), "en"), "Cleanse");
  });

  it("se replie sur le français quand la traduction manque", () => {
    // Mieux vaut un libellé dans l'autre langue qu'une clé brute à l'écran.
    assert.equal(libelleGeste(geste({ labelEn: "" }), "en"), "Nettoyer");
  });
});
