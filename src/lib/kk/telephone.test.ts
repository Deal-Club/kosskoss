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

  it("ne confond jamais un fixe de neuf chiffres avec un indicatif", () => {
    // 237222333 est un numéro national complet (fixe : premier chiffre 2), pas
    // un « 237 » suivi d'un numéro à six chiffres : neuf chiffres ≠ douze, le
    // dépouillement de l'indicatif ne se déclenche donc pas. C'est exactement
    // l'ambiguïté que la longueur est censée lever — sans ce cas, un futur
    // changement de la garde de longueur pourrait la casser sans faire échouer
    // aucun autre test.
    assert.equal(normaliserTelephone("237222333"), "+237237222333");
  });

  it("refuse un indicatif 00237 suivi de moins de neuf chiffres", () => {
    // L'indicatif explicite ne dispense pas d'un numéro national complet :
    // accepter silencieusement un reliquat trop court masquerait une saisie
    // tronquée plutôt que de la signaler.
    assert.equal(normaliserTelephone("0023712345"), null);
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
