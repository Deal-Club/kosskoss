import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estVilleLivraison, fraisLivraisonFcfa } from "./livraison";

describe("estVilleLivraison", () => {
  it("reconnaît les trois clés valides", () => {
    assert.equal(estVilleLivraison("douala"), true);
    assert.equal(estVilleLivraison("yaounde"), true);
    assert.equal(estVilleLivraison("autre"), true);
  });

  it("rejette une clé inconnue ou vide", () => {
    assert.equal(estVilleLivraison("paris"), false);
    assert.equal(estVilleLivraison(""), false);
  });
});

describe("fraisLivraisonFcfa", () => {
  it("applique le même tarif à Douala et Yaoundé", () => {
    assert.equal(fraisLivraisonFcfa("douala"), fraisLivraisonFcfa("yaounde"));
  });

  it("facture plus cher une livraison hors des deux grandes villes", () => {
    assert.ok(fraisLivraisonFcfa("autre") > fraisLivraisonFcfa("douala"));
  });

  it("retombe sur le tarif « autre » pour une clé invalide", () => {
    assert.equal(fraisLivraisonFcfa("nimporte-quoi"), fraisLivraisonFcfa("autre"));
  });
});
