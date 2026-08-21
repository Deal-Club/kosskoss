import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { margeUnitaire, tauxMarge } from "./marge";

describe("margeUnitaire", () => {
  it("rend la différence entre le prix et le coût", () => {
    assert.equal(margeUnitaire(18500, 12000), 6500);
  });

  it("rend null quand le coût n'est pas renseigné", () => {
    // Un coût absent n'est pas un coût nul : on ne sait pas, et une marge
    // inventée serait pire qu'une marge manquante.
    assert.equal(margeUnitaire(18500, null), null);
    assert.equal(margeUnitaire(18500, undefined), null);
  });

  it("accepte un coût réellement nul", () => {
    // Un échantillon reçu gratuitement a un coût de zéro, ce qui est une
    // information, pas une absence.
    assert.equal(margeUnitaire(18500, 0), 18500);
  });

  it("rend une marge négative quand le produit est vendu à perte", () => {
    // Le cas existe — déstockage, erreur de saisie — et le masquer
    // empêcherait justement de le repérer.
    assert.equal(margeUnitaire(10000, 12000), -2000);
  });
});

describe("tauxMarge", () => {
  it("calcule le taux sur le PRIX DE VENTE", () => {
    // Convention du commerce de détail : (prix - coût) / prix.
    // 18 500 - 12 000 = 6 500, soit 35,1 % de 18 500.
    assert.equal(tauxMarge(18500, 12000), 35.1);
  });

  it("rend 100 % quand le produit n'a rien coûté", () => {
    assert.equal(tauxMarge(18500, 0), 100);
  });

  it("rend null quand le coût n'est pas renseigné", () => {
    assert.equal(tauxMarge(18500, null), null);
  });

  it("rend null quand le prix est nul", () => {
    // Diviser par le prix de vente exige qu'il existe. Un prix à zéro n'a pas
    // de taux, il n'a pas d'erreur non plus.
    assert.equal(tauxMarge(0, 12000), null);
  });

  it("rend un taux négatif à perte", () => {
    assert.equal(tauxMarge(10000, 12000), -20);
  });

  it("arrondit à une décimale", () => {
    // Un taux affiché avec quinze décimales ne se lit pas.
    assert.equal(tauxMarge(3000, 1000), 66.7);
  });
});
