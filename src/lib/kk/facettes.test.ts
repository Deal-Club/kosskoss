import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { produitCorrespond } from "./facettes";

describe("produitCorrespond", () => {
  it("laisse tout passer quand aucune facette n'est cochée", () => {
    assert.equal(produitCorrespond(["peau_grasse"], []), true);
    assert.equal(produitCorrespond([], []), true);
  });

  it("retient un produit portant l'une des clés cochées", () => {
    // Union et non intersection : cocher « peau grasse » ET « peau mixte » doit
    // élargir la sélection, pas la vider. C'est ainsi que se comportent déjà
    // les facettes de marque.
    assert.equal(produitCorrespond(["peau_grasse", "hydratation"], ["peau_grasse"]), true);
    assert.equal(produitCorrespond(["peau_mixte"], ["peau_grasse", "peau_mixte"]), true);
  });

  it("écarte un produit ne portant aucune clé cochée", () => {
    assert.equal(produitCorrespond(["peau_seche"], ["peau_grasse"]), false);
  });

  it("écarte un produit sans aucun tag dès qu'une facette est cochée", () => {
    assert.equal(produitCorrespond([], ["peau_grasse"]), false);
  });
});
