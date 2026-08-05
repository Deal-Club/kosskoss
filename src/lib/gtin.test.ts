import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidGtin } from "./gtin";

test("isValidGtin accepte les longueurs GTIN officielles", () => {
  assert.equal(isValidGtin("4006381333931"), true); // EAN-13
  assert.equal(isValidGtin("036000291452"), true); // UPC-A
  assert.equal(isValidGtin("96385074"), true); // EAN-8
  assert.equal(isValidGtin("14006381333938"), true); // GTIN-14
});

test("isValidGtin rejette une clé de contrôle fausse", () => {
  assert.equal(isValidGtin("4006381333930"), false); // EAN-13 invalide
  assert.equal(isValidGtin("036000291453"), false); // UPC-A invalide
  assert.equal(isValidGtin("400638133393"), false); // UPC-A, checksum invalide
  assert.equal(isValidGtin("14006381333930"), false); // GTIN-14 invalide
});

test("isValidGtin rejette les longueurs hors spécification", () => {
  assert.equal(isValidGtin("1234567890"), false);
  assert.equal(isValidGtin(""), false);
});

test("isValidGtin accepte GTIN-14 valide et rejette GTIN-14 invalide", () => {
  assert.equal(isValidGtin("14006381333938"), true); // GTIN-14 valide
  assert.equal(isValidGtin("14006381333930"), false); // GTIN-14 invalide
});

test("isValidGtin rejette tout ce qui n'est pas une suite de chiffres", () => {
  assert.equal(isValidGtin("400638133393X"), false);
  assert.equal(isValidGtin("4006-3813-3393-1"), false);
});

test("isValidGtin tolère les espaces autour du code", () => {
  assert.equal(isValidGtin("  4006381333931 "), true);
});

test("isValidGtin rejette les séquences entièrement nulles", () => {
  assert.equal(isValidGtin("00000000"), false); // EAN-8
  assert.equal(isValidGtin("000000000000"), false); // UPC-A
  assert.equal(isValidGtin("0000000000000"), false); // EAN-13
  assert.equal(isValidGtin("00000000000000"), false); // GTIN-14
});

test("isValidGtin rejette les EAN-13 à circulation restreinte (préfixe 2, 02, 04)", () => {
  assert.equal(isValidGtin("2001234567893"), false); // préfixe 2
  assert.equal(isValidGtin("2900000000001"), false); // préfixe 2
  assert.equal(isValidGtin("0212345678909"), false); // préfixe 02
  assert.equal(isValidGtin("0412345678903"), false); // préfixe 04
});

test("isValidGtin accepte les GTIN réellement utilisés par le catalogue", () => {
  const catalogue = [
    "3760366603266",
    "3760366603273",
    "3244330110009",
    "3244330110542",
    "3244330110696",
    "3244330110801",
    "8022724371008",
  ];
  for (const code of catalogue) {
    assert.equal(isValidGtin(code), true, code);
  }
});
