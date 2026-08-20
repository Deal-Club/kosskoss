// src/lib/kk/telephone.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INDICATIF_CM, normaliserTelephone } from "./telephone";

describe("normaliserTelephone", () => {
  it("accepte un mobile nu et le met en forme internationale", () => {
    assert.equal(normaliserTelephone("677123456"), "+237677123456");
  });

  it("accepte un fixe", () => {
    // Le numéro sert le contact de livraison : rien n'oblige le client à
    // donner un mobile.
    assert.equal(normaliserTelephone("233421234"), "+237233421234");
  });

  it("accepte l'indicatif sous ses trois formes", () => {
    assert.equal(normaliserTelephone("+237677123456"), "+237677123456");
    assert.equal(normaliserTelephone("00237677123456"), "+237677123456");
    assert.equal(normaliserTelephone("237677123456"), "+237677123456");
  });

  it("ignore espaces, points, tirets et parenthèses", () => {
    assert.equal(normaliserTelephone("+237 6 77 12 34 56"), "+237677123456");
    assert.equal(normaliserTelephone("677-12-34-56"), "+237677123456");
    assert.equal(normaliserTelephone("(237) 677.12.34.56"), "+237677123456");
  });

  it("refuse un numéro trop court", () => {
    assert.equal(normaliserTelephone("67712345"), null);
  });

  it("refuse un numéro trop long", () => {
    assert.equal(normaliserTelephone("6771234567"), null);
  });

  it("refuse un préfixe qui n'existe pas au Cameroun", () => {
    // Ni mobile (6) ni fixe (2) : c'est une faute de frappe, pas un numéro.
    assert.equal(normaliserTelephone("377123456"), null);
    assert.equal(normaliserTelephone("977123456"), null);
  });

  it("refuse une saisie vide ou sans chiffre", () => {
    assert.equal(normaliserTelephone(""), null);
    assert.equal(normaliserTelephone("   "), null);
    assert.equal(normaliserTelephone("appelez-moi"), null);
  });

  it("expose l'indicatif", () => {
    assert.equal(INDICATIF_CM, "+237");
  });
});
