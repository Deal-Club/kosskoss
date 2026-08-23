import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NIVEAUX, estNiveau, LIBELLES_NIVEAUX, libelleNiveau } from "./routines-niveau";

describe("NIVEAUX", () => {
  it("porte exactement les deux niveaux du master, eco puis premium", () => {
    assert.deepEqual(NIVEAUX, ["eco", "premium"]);
  });
});

describe("estNiveau", () => {
  it("reconnaît eco", () => {
    assert.equal(estNiveau("eco"), true);
  });

  it("reconnaît premium", () => {
    assert.equal(estNiveau("premium"), true);
  });

  it("rejette une valeur du master non normalisée (Eco, avec majuscule)", () => {
    assert.equal(estNiveau("Eco"), false);
  });

  it("rejette une chaîne vide", () => {
    assert.equal(estNiveau(""), false);
  });

  it("rejette une valeur inconnue", () => {
    assert.equal(estNiveau("standard"), false);
  });
});

describe("LIBELLES_NIVEAUX", () => {
  it("donne « Essentielle » pour eco et « Premium » pour premium", () => {
    assert.equal(LIBELLES_NIVEAUX.eco, "Essentielle");
    assert.equal(LIBELLES_NIVEAUX.premium, "Premium");
  });

  it("a exactement une entrée par niveau, ni plus ni moins", () => {
    assert.deepEqual(Object.keys(LIBELLES_NIVEAUX).sort(), [...NIVEAUX].sort());
  });
});

describe("libelleNiveau", () => {
  it("traduit un niveau connu", () => {
    assert.equal(libelleNiveau("eco"), "Essentielle");
    assert.equal(libelleNiveau("premium"), "Premium");
  });

  it("replie sur la valeur brute pour un niveau inconnu ou corrompu en base", () => {
    assert.equal(libelleNiveau("inconnu"), "inconnu");
    assert.equal(libelleNiveau(""), "");
  });
});
